import { outletForPin } from "./deliveryOutlets.js";
import {
  applyCoupon,
  couponDiscountOnSale,
  findCoupon,
} from "./offers.js";
import { isOnlinePayment } from "./paymentMethods.js";
import { coinsToRupees, quoteWalletSpend } from "./pointsStore.js";

/** Platform share of each rupee of MRP / sale. Remainder is for the working partner. */
export const SPLIT_PLATFORM_PERCENT = {
  medicine: 40,
  lab: 15,
  radiology: 15,
  homecare: 20,
  vaccination: 20,
  psychologist: 20,
  stepdown: 10,
  ambulance: 15,
};

export const PARTNER_SHARE_LABEL = {
  medicine: "Delivery outlet",
  lab: "Lab partner",
  radiology: "Imaging centre",
  homecare: "Home Care professional",
  vaccination: "Vaccination nurse",
  psychologist: "Psychologist",
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

function roundRupees(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Partner is paid their % of MRP / sale.
 * Coupons and other offers are taken only from MediHome's share.
 * MediHome keeps: (amount the customer pays after discount) − partner share of MRP.
 */
export function splitPayment(kind, amountRupees, pin, options = {}) {
  const sale = Math.max(
    0,
    Number(options.saleRupees ?? options.mrpRupees ?? amountRupees) || 0
  );
  const payable = Math.max(
    0,
    Number(options.payableRupees ?? amountRupees) || 0
  );
  const salePaise = rupeesToPaise(sale);
  const payablePaise = rupeesToPaise(payable);
  const discountPaise = Math.max(0, salePaise - payablePaise);
  const platformPct = platformPercentFor(kind, options.platformPercent);
  const partnerPct = 100 - platformPct;
  const partnerPaise = Math.round((salePaise * partnerPct) / 100);
  const platformPaise = payablePaise - partnerPaise;
  const partnerTransferPaise = Math.min(partnerPaise, payablePaise);
  const platformSettledPaise = payablePaise - partnerTransferPaise;
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
    couponCode,
    couponLabel: String(options.couponLabel || ""),
    discountFrom: "medihome",
    platformPercent: platformPct,
    partnerPercent: partnerPct,
    platformPaise,
    platformRupees: paiseToRupees(platformPaise),
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
      moneyLine("MediHome", "medihome", "MediHome share retained", mhShare, "retain"),
    ];
  } else if (!reverse && !online) {
    dueToPartnerRupees = partnerShare;
    medihomeAccountRupees = mhShare;
    ledger = [
      moneyLine("MediHome", "medihome", "Cash collected from customer", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share payable to partner", partnerShare, "due"),
      moneyLine("MediHome", "medihome", "MediHome share retained from cash", mhShare, "retain"),
    ];
  } else if (reverse && online) {
    medihomeAccountRupees = mhShare;
    partnerAccountRupees = partnerShare;
    ledger = [
      moneyLine(partnerLabel, "partner", "Collected online by service provider", collected, "collected"),
      moneyLine(partnerLabel, "partner", "Partner share credited to partner account", partnerShare, "credit"),
      moneyLine("MediHome", "medihome", "Balance credited to MediHome account", mhShare, "credit"),
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
        "MediHome portion — balance towards service provider",
        mhShare,
        "due"
      ),
    ];
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
  collector,
  paymentMethod,
  paidOn,
  useWallet,
  walletCoins,
  walletMoneyRupees,
} = {}) {
  const sale = Math.max(0, Number(saleRupees) || 0);
  const list = Math.max(0, Number(listRupees ?? sale) || 0);
  const coupon = findCoupon(couponCode);
  const couponDiscount = coupon ? couponDiscountOnSale(coupon, sale) : 0;
  const couponResult = couponCode
    ? applyCoupon(couponCode, sale)
    : { ok: true, coupon: null, discountRupees: 0 };
  const offerDiscount = coupon
    ? 0
    : Math.max(0, roundRupees(sale - list));
  const afterOffers = Math.max(0, roundRupees(sale - offerDiscount - couponDiscount));
  const wallet = useWallet
    ? quoteWalletSpend({
        moneyRupees: walletMoneyRupees,
        coins: walletCoins,
        remainingRupees: afterOffers,
      })
    : { moneyRupees: 0, coins: 0, rupees: 0 };
  const payable = Math.max(0, roundRupees(afterOffers - wallet.rupees));
  const split = splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    couponCode: coupon?.code || "",
    couponLabel: coupon?.label || "",
    platformPercent,
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
    walletDiscountRupees: wallet.rupees,
    walletMoneyRupees: wallet.moneyRupees,
    walletCoins: wallet.coins,
    pointsDiscountRupees: coinsToRupees(wallet.coins),
    pointsUsed: wallet.coins,
    payableRupees: payable,
    split,
  };
}
