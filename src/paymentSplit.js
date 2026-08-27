import { outletForPin } from "./deliveryOutlets.js";
import {
  applyCoupon,
  couponDiscountOnSale,
  findCoupon,
} from "./offers.js";

/** Platform share of each rupee of MRP / sale. Remainder is for the working partner. */
export const SPLIT_PLATFORM_PERCENT = {
  medicine: 40,
  lab: 15,
  radiology: 15,
  homecare: 20,
  stepdown: 10,
  ambulance: 15,
};

export const PARTNER_SHARE_LABEL = {
  medicine: "Delivery outlet",
  lab: "Lab partner",
  radiology: "Imaging centre",
  homecare: "Home Care professional",
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
  return {
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
}

export function quoteCheckout({
  kind,
  saleRupees,
  listRupees,
  couponCode,
  pin,
  platformPercent,
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
  const payable = Math.max(0, roundRupees(sale - offerDiscount - couponDiscount));
  const split = splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    couponCode: coupon?.code || "",
    couponLabel: coupon?.label || "",
    platformPercent,
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
    payableRupees: payable,
    split,
  };
}
