import { outletForPin } from "./deliveryOutlets.js";
import {
  applyCoupon,
  couponDiscountOnSale,
  findCoupon,
} from "./offers.js";
import { isOnlinePayment, isPaidCheckoutMethod } from "./paymentMethods.js";
import {
  canRedeemPoints,
  coinsToRupees,
  pointsRedeemAllowedForKind,
  quoteWalletSpend,
} from "./walletQuote.js";

/** Platform share of each rupee of MRP / sale. Remainder is for the working partner. */
export const SPLIT_PLATFORM_PERCENT = {
  medicine: 40,
  cart: 25,
  lab: 15,
  radiology: 15,
  homecare: 20,
  vaccination: 20,
  psychologist: 20,
  doctor: 20,
  stepdown: 10,
  ambulance: 15,
};

export const PARTNER_SHARE_LABEL = {
  medicine: "Delivery outlet",
  cart: "MediHome partners",
  lab: "Lab partner",
  radiology: "Imaging centre",
  homecare: "Home Care professional",
  vaccination: "Vaccination nurse",
  psychologist: "Psychologist",
  doctor: "Doctor",
  stepdown: "Step-down centre",
  ambulance: "Ambulance operator",
};

export function rupeesToPaise(amount) {
  return Math.max(0, Math.round(Number(amount || 0) * 100));
}

export function paiseToRupees(paise) {
  return Math.round(Number(paise || 0)) / 100;
}

export function platformPercentFor(kind, override) {
  if (override != null && Number.isFinite(Number(override))) {
    return Math.min(100, Math.max(0, Number(override)));
  }
  return SPLIT_PLATFORM_PERCENT[kind] ?? 20;
}

export function partnerPercentFor(kind, override) {
  return 100 - platformPercentFor(kind, override);
}

export function clampSplitPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function defaultPartnerPercentFor(kind) {
  return partnerPercentFor(kind);
}

export function platformPercentFromPartnerShare(partnerPercent, kind) {
  const partner = clampSplitPercent(partnerPercent);
  if (partner == null) return platformPercentFor(kind);
  return 100 - partner;
}

/** Recalculate an order's collection split using a staff-set partner %. */
export function resplitOrder(order = {}, extras = {}) {
  const kind = order.kind || order.orderType || "medicine";
  const pin = order.pinCode || order.pin || "";
  const payable = Number(
    extras.payableRupees ??
      order.split?.payableRupees ??
      order.total ??
      order.charges ??
      0
  );
  const sale = Number(
    extras.saleRupees ?? order.split?.saleRupees ?? order.saleRupees ?? payable
  );
  const explicitPlatform =
    extras.platformPercent != null
      ? clampSplitPercent(extras.platformPercent)
      : extras.partnerPercent != null
        ? platformPercentFromPartnerShare(extras.partnerPercent, kind)
        : null;
  const paymentMethod = extras.paymentMethod || order.paymentMethod || "";
  const paidOn = extras.paidOn || order.paidOn || order.split?.paidOn || "";
  return splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    couponCode:
      extras.couponCode || order.split?.couponCode || order.couponCode || "",
    couponLabel: extras.couponLabel || order.split?.couponLabel || "",
    ...(explicitPlatform != null ? { platformPercent: explicitPlatform } : {}),
    tests: extras.tests || order.tests,
    paymentMethod,
    paidOn,
    collector: extras.collector || order.collector || order.split?.collector,
  });
}

/** Lab line items keep each test's split. Other services use the partner record %. */
export function splitExtrasForAssignedPartner(order = {}, partner = {}) {
  const kind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
  if (kind === "lab") return { tests: order.tests };
  return { partnerPercent: partner?.partnerPercent };
}

function labLinePartnerPaise(tests, fallbackPartnerPct) {
  const lines = Array.isArray(tests) ? tests.filter((row) => row && typeof row === "object") : [];
  if (!lines.length) return null;
  let partnerPaise = 0;
  let salePaise = 0;
  let counted = 0;
  for (const line of lines) {
    const qty = Math.max(1, Math.round(Number(line.quantity || line.qty || 1) || 1));
    const price = Number(line.price ?? line.saleRupees ?? line.amount);
    if (!Number.isFinite(price) || price <= 0) continue;
    const linePaise = rupeesToPaise(price) * qty;
    const tp = Number(line.tp);
    const explicit = clampSplitPercent(line.partnerPercent);
    let sharePaise;
    if (Number.isFinite(tp) && tp >= 0) {
      sharePaise = Math.min(linePaise, rupeesToPaise(tp) * qty);
    } else if (explicit != null) {
      sharePaise = Math.round((linePaise * explicit) / 100);
    } else {
      sharePaise = Math.round((linePaise * fallbackPartnerPct) / 100);
    }
    partnerPaise += sharePaise;
    salePaise += linePaise;
    counted += 1;
  }
  if (!counted || salePaise <= 0) return null;
  return { partnerPaise, salePaise };
}

function roundRupees(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Partner is paid their % of MRP / sale — never reduced by discounts or points.
 * Coupons, offers and MediHome points are deducted only from MediHome's share.
 * Service charge / platform fee (if any) is credited only to MediHome.
 *
 * payable (customer pays) = sale − discounts − points + serviceCharge
 * partnerShare           = partner% × sale
 * medihomeShare          = payable − partnerShare
 *                        = platform% × sale − discounts − points + serviceCharge
 */
export function splitPayment(kind, amountRupees, pin, options = {}) {
  const sale = Math.max(
    0,
    Number(options.saleRupees ?? options.mrpRupees ?? amountRupees) || 0
  );
  const offerDiscount = Math.max(0, Number(options.offerDiscountRupees) || 0);
  const couponDiscount = Math.max(0, Number(options.couponDiscountRupees) || 0);
  const pointsDiscount = Math.max(
    0,
    Number(options.pointsDiscountRupees ?? options.walletDiscountRupees) || 0
  );
  const serviceCharge = Math.max(
    0,
    Number(options.serviceChargeRupees ?? options.platformFeeRupees) || 0
  );
  const namedDiscount = roundRupees(offerDiscount + couponDiscount + pointsDiscount);

  let payable;
  if (options.payableRupees != null && Number.isFinite(Number(options.payableRupees))) {
    payable = Math.max(0, Number(options.payableRupees) || 0);
  } else {
    payable = Math.max(0, roundRupees(sale - namedDiscount + serviceCharge));
  }

  const salePaise = rupeesToPaise(sale);
  const payablePaise = rupeesToPaise(payable);
  const serviceChargePaise = rupeesToPaise(serviceCharge);
  const goodsPayablePaise = Math.max(0, payablePaise - serviceChargePaise);
  const discountPaise = Math.max(0, salePaise - goodsPayablePaise);
  const kindPartnerPct = partnerPercentFor(kind);
  let platformPct = platformPercentFor(kind, options.platformPercent);
  let partnerPct = 100 - platformPct;
  const lineSplit =
    String(kind || "").toLowerCase() === "lab" && options.platformPercent == null
      ? labLinePartnerPaise(options.tests || options.lines, kindPartnerPct)
      : null;

  // Partner share is always % of MRP / sale, not of discounted payable.
  let partnerPaise;
  if (lineSplit) {
    partnerPaise = lineSplit.partnerPaise;
    if (lineSplit.salePaise > salePaise && salePaise > 0) {
      partnerPaise = Math.round((lineSplit.partnerPaise * salePaise) / lineSplit.salePaise);
    } else if (salePaise > lineSplit.salePaise) {
      partnerPaise += Math.round(((salePaise - lineSplit.salePaise) * kindPartnerPct) / 100);
    }
    partnerPct = salePaise > 0 ? Math.round((partnerPaise * 100) / salePaise) : partnerPct;
    partnerPct = Math.min(100, Math.max(0, partnerPct));
    platformPct = 100 - partnerPct;
  } else {
    partnerPaise = Math.round((salePaise * partnerPct) / 100);
  }
  // MediHome absorbs all discounts/points; fee is added to MediHome only.
  const partnerTransferPaise = Math.min(partnerPaise, goodsPayablePaise);
  const platformSettledPaise = payablePaise - partnerTransferPaise;
  const platformGoodsPaise = platformSettledPaise - serviceChargePaise;
  const outlet = outletForPin(pin);
  const couponCode = String(options.couponCode || "").trim();
  const split = {
    currency: "INR",
    kind,
    saleRupees: paiseToRupees(salePaise),
    salePaise,
    payableRupees: paiseToRupees(payablePaise),
    payablePaise,
    totalRupees: paiseToRupees(payablePaise),
    totalPaise: payablePaise,
    discountRupees: paiseToRupees(discountPaise),
    discountPaise,
    discountPercent:
      salePaise > 0 ? Math.round((discountPaise / salePaise) * 1000) / 10 : 0,
    offerDiscountRupees: roundRupees(offerDiscount),
    couponDiscountRupees: roundRupees(couponDiscount),
    pointsDiscountRupees: roundRupees(pointsDiscount),
    serviceChargeRupees: paiseToRupees(serviceChargePaise),
    serviceChargePaise,
    platformFeeRupees: paiseToRupees(serviceChargePaise),
    couponCode,
    couponLabel: String(options.couponLabel || ""),
    discountFrom: "medihome",
    serviceChargeTo: "medihome",
    platformPercent: platformPct,
    partnerPercent: partnerPct,
    platformPaise: platformGoodsPaise,
    platformRupees: paiseToRupees(platformGoodsPaise),
    platformSettledPaise,
    platformSettledRupees: paiseToRupees(platformSettledPaise),
    partnerPaise,
    partnerRupees: paiseToRupees(partnerPaise),
    partnerTransferPaise,
    partnerTransferRupees: paiseToRupees(partnerTransferPaise),
    partnerLabel: PARTNER_SHARE_LABEL[kind] || "Partner",
    outletId: outlet?.id || "",
    outletName: outlet?.name || "MediHome Central Fulfilment",
    razorpayAccountId: outlet?.razorpayAccountId || "",
  };
  return attachSettlement(split, {
    collector: options.collector,
    paymentMethod: options.paymentMethod,
    paidOn: options.paidOn,
  });
}

export function paidOnChannel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "partner" || key === "provider" || key === "partner-app") {
    return "partner";
  }
  return "customer";
}

function isPartnerCollectorKey(value) {
  const key = String(value || "").toLowerCase();
  return key === "partner" || key === "provider" || key === "reverse";
}

/** Main-app online → MediHome. Cash or partner-app pay → partner. */
export function resolveCollector({ method, paidOn, collector } = {}) {
  if (paidOnChannel(paidOn) === "partner") return "partner";
  if (method && !isOnlinePayment(method)) return "partner";
  if (!paidOn && isPartnerCollectorKey(collector)) return "partner";
  return "medihome";
}

export function normalizeCollector(collector, method, paidOn) {
  return resolveCollector({ collector, method, paidOn });
}

function moneyLine(party, partyKey, note, amountRupees, kind) {
  return { party, partyKey, note, amountRupees, kind };
}

export function attachSettlement(split, { collector, paymentMethod, paidOn } = {}) {
  const method = paymentMethod || "online";
  const who = resolveCollector({ collector, method, paidOn });
  const reverse = who === "partner";
  const online = isOnlinePayment(method);
  const partnerLabel = split.partnerLabel || "Partner";
  const collected = Number(split.payableRupees || 0);
  const partnerShare = Number(split.partnerTransferRupees || 0);
  const mhShare = Number(split.platformSettledRupees || 0);
  const fee = Number(split.serviceChargeRupees || split.platformFeeRupees || 0);
  const discount = Number(split.discountRupees || 0);
  let dueFromPartnerRupees = 0;
  let dueToPartnerRupees = 0;
  let medihomeAccountRupees = 0;
  let partnerAccountRupees = 0;
  let ledger = [];

  if (!reverse && online) {
    dueToPartnerRupees = 0;
    medihomeAccountRupees = mhShare;
    partnerAccountRupees = partnerShare;
    ledger = [
      moneyLine("MediHome", "medihome", "Collected online from customer", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share credited to partner account", partnerShare, "credit"),
      moneyLine(
        "MediHome",
        "medihome",
        discount > 0
          ? "MediHome share retained (discounts/points deducted from MediHome)"
          : "MediHome share retained",
        mhShare,
        "retain"
      ),
    ];
  } else if (!reverse && !online) {
    dueToPartnerRupees = partnerShare;
    medihomeAccountRupees = mhShare;
    ledger = [
      moneyLine("MediHome", "medihome", "Cash collected from customer", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share payable to partner", partnerShare, "due"),
      moneyLine(
        "MediHome",
        "medihome",
        discount > 0
          ? "MediHome share retained from cash (discounts/points deducted from MediHome)"
          : "MediHome share retained from cash",
        mhShare,
        "retain"
      ),
    ];
  } else if (reverse && online) {
    medihomeAccountRupees = mhShare;
    partnerAccountRupees = partnerShare;
    ledger = [
      moneyLine(partnerLabel, "partner", "Collected online by service provider", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share credited to partner account", partnerShare, "credit"),
      moneyLine(
        "MediHome",
        "medihome",
        discount > 0
          ? "Balance credited to MediHome (discounts/points deducted from MediHome)"
          : "Balance credited to MediHome account",
        mhShare,
        "credit"
      ),
    ];
  } else {
    dueFromPartnerRupees = mhShare;
    partnerAccountRupees = collected;
    ledger = [
      moneyLine(partnerLabel, "partner", "Cash collected by service provider", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share retained from cash", partnerShare, "retain"),
      moneyLine(
        "MediHome",
        "medihome",
        discount > 0
          ? "MediHome portion due (discounts/points deducted from MediHome)"
          : "MediHome portion — balance towards service provider",
        mhShare,
        "due"
      ),
    ];
  }

  if (fee > 0) {
    ledger.push(
      moneyLine(
        "MediHome",
        "medihome",
        "Service charge / platform fee credited to MediHome",
        fee,
        "fee"
      )
    );
  }

  return {
    ...split,
    collector: who,
    paidOn: who === "partner" ? "partner" : "customer",
    splitMode: reverse ? "reverse" : "forward",
    collection: online ? "online" : "cash",
    dueFromPartnerRupees,
    dueToPartnerRupees,
    medihomeAccountRupees,
    partnerAccountRupees,
    medihomeCreditDest: "settlement_bank",
    medihomeCreditRupees: mhShare,
    ledger,
  };
}

export function settlementSummary(split) {
  if (!split?.splitMode) return "";
  const mh = Number(split.dueFromPartnerRupees || split.medihomeAccountRupees || 0);
  const partner = Number(split.partnerAccountRupees || split.dueToPartnerRupees || 0);
  if (split.splitMode === "reverse" && split.collection === "cash") {
    return `Service provider collected cash. MediHome ₹${mh} is balance towards the service provider.`;
  }
  if (split.splitMode === "reverse") {
    return `Service provider collected online. Partner ₹${partner} credited to partner account. MediHome ₹${mh} credited to MediHome.`;
  }
  if (split.collection === "cash") {
    return `Cash collected by MediHome. Partner share ₹${split.dueToPartnerRupees} payable to partner.`;
  }
  return `Collected by MediHome. Partner ₹${partner} credited to partner account.`;
}

export function ledgerShareText(split) {
  if (!split) return "";
  const row = ensureSettlement(split) || split;
  const lines = [
    `MediHome Settlement (${splitModeLabel(row)})`,
    `Collected By: ${row.collector === "partner" ? row.partnerLabel || "Service Provider" : "MediHome"}`,
    `Collection: ${row.collection === "online" ? "Online" : "Cash"}`,
  ];
  for (const entry of row.ledger || []) {
    lines.push(`${entry.party}: ${entry.note} — ₹${entry.amountRupees}`);
  }
  if (row.dueFromPartnerRupees) {
    lines.push(`Due From Service Provider: ₹${row.dueFromPartnerRupees}`);
  }
  if (row.dueToPartnerRupees) {
    lines.push(`Due To Partner: ₹${row.dueToPartnerRupees}`);
  }
  return lines.join("\n");
}

export function ensureSettlement(split, extras = {}) {
  if (!split || typeof split !== "object") return null;
  if (split.splitMode && Array.isArray(split.ledger)) return split;
  return attachSettlement(split, extras);
}

export function splitModeLabel(split) {
  return split?.splitMode === "reverse" ? "Reverse Split" : "Forward Split";
}

export function settlementOpsNote(split, extras = {}) {
  const row = ensureSettlement(split, extras);
  if (!row?.splitMode) return "";
  const mode = splitModeLabel(row);
  if (row.splitMode === "reverse" && row.collection === "cash") {
    return `${mode} · Due From Partner ₹${row.dueFromPartnerRupees}`;
  }
  if (row.splitMode === "reverse") {
    return `${mode} · Partner Credited ₹${row.partnerAccountRupees} · MediHome Credited ₹${row.medihomeAccountRupees}`;
  }
  if (row.collection === "cash") {
    return `${mode} · Due To Partner ₹${row.dueToPartnerRupees}`;
  }
  return `${mode} · Partner Credited ₹${row.partnerAccountRupees}`;
}

export function partnerSettlementNote(split, extras = {}) {
  const row = ensureSettlement(split, extras);
  if (!row?.splitMode) return "";
  if (row.splitMode === "reverse" && row.collection === "cash") {
    return `Due To MediHome ₹${row.dueFromPartnerRupees}`;
  }
  if (row.splitMode === "reverse") {
    return `Credited To Your Account ₹${row.partnerAccountRupees}`;
  }
  if (row.collection === "cash") {
    return `Due To You ₹${row.dueToPartnerRupees}`;
  }
  return `Credited To Your Account ₹${row.partnerAccountRupees}`;
}

export function quoteCheckout({
  kind,
  saleRupees,
  listRupees,
  couponCode,
  pin,
  platformPercent,
  tests,
  collector,
  paymentMethod,
  paidOn,
  useWallet,
  walletCoins,
  walletMoneyRupees,
  walletEligibleRupees,
  serviceChargeRupees,
  platformFeeRupees,
} = {}) {
  const sale = Math.max(0, Number(saleRupees) || 0);
  const list = Math.max(0, Number(listRupees ?? sale) || 0);
  const fee = Math.max(
    0,
    Number(serviceChargeRupees ?? platformFeeRupees) || 0
  );
  const coupon = findCoupon(couponCode);
  const couponDiscount = coupon ? couponDiscountOnSale(coupon, sale) : 0;
  const couponResult = couponCode
    ? applyCoupon(couponCode, sale)
    : { ok: true, coupon: null, discountRupees: 0 };
  const offerDiscount = coupon
    ? 0
    : Math.max(0, roundRupees(sale - list));
  const afterOffers = Math.max(0, roundRupees(sale - offerDiscount - couponDiscount));
  const pointsAllowed = pointsRedeemAllowedForKind(kind);
  const eligibleCap = pointsAllowed
    ? Math.max(0, Number(walletEligibleRupees ?? afterOffers) || 0)
    : 0;
  const remainingForPoints = Math.min(afterOffers, eligibleCap);
  const applyWallet =
    Boolean(useWallet) &&
    canRedeemPoints(walletCoins) &&
    remainingForPoints > 0 &&
    isPaidCheckoutMethod(paymentMethod);
  const wallet = applyWallet
    ? quoteWalletSpend({
        moneyRupees: walletMoneyRupees,
        coins: walletCoins,
        remainingRupees: remainingForPoints,
      })
    : { moneyRupees: 0, coins: 0, rupees: 0 };
  const pointsDiscount = coinsToRupees(wallet.coins);
  const walletDiscount = wallet.rupees;
  const goodsPayable = Math.max(0, roundRupees(afterOffers - walletDiscount));
  const payable = Math.max(0, roundRupees(goodsPayable + fee));
  const split = splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    offerDiscountRupees: offerDiscount,
    couponDiscountRupees: roundRupees(couponDiscount),
    pointsDiscountRupees: pointsDiscount,
    walletDiscountRupees: walletDiscount,
    serviceChargeRupees: fee,
    couponCode: coupon?.code || "",
    couponLabel: coupon?.label || "",
    platformPercent,
    tests,
    collector,
    paymentMethod,
    paidOn,
  });
  return {
    kind,
    saleRupees: roundRupees(sale),
    listRupees: roundRupees(list),
    offerDiscountRupees: offerDiscount,
    couponCode: coupon?.code || "",
    couponLabel: coupon?.label || "",
    couponDiscountRupees: roundRupees(couponDiscount),
    couponError: couponResult.ok ? "" : couponResult.error,
    walletDiscountRupees: walletDiscount,
    walletMoneyRupees: wallet.moneyRupees,
    walletCoins: wallet.coins,
    pointsDiscountRupees: pointsDiscount,
    pointsUsed: wallet.coins,
    serviceChargeRupees: fee,
    platformFeeRupees: fee,
    payableRupees: payable,
    split,
  };
}
