import { outletForPin } from "./deliveryOutlets.js";

/** Platform share of each rupee. Remainder is for the working partner / outlet. */
export const SPLIT_PLATFORM_PERCENT = {
  medicine: 20,
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

export function splitPayment(kind, amountRupees, pin) {
  const total = Math.max(0, Number(amountRupees) || 0);
  const totalPaise = rupeesToPaise(total);
  const platformPct = SPLIT_PLATFORM_PERCENT[kind] ?? 20;
  const platformPaise = Math.round((totalPaise * platformPct) / 100);
  const partnerPaise = Math.max(0, totalPaise - platformPaise);
  const outlet = outletForPin(pin);
  return {
    currency: "INR",
    kind,
    totalRupees: paiseToRupees(totalPaise),
    totalPaise,
    platformPercent: platformPct,
    platformPaise,
    platformRupees: paiseToRupees(platformPaise),
    partnerPaise,
    partnerRupees: paiseToRupees(partnerPaise),
    partnerLabel: PARTNER_SHARE_LABEL[kind] || "Partner",
    outletId: outlet?.id || "",
    outletName: outlet?.name || "MediHome Central Fulfilment",
    razorpayAccountId: outlet?.razorpayAccountId || "",
  };
}
