export const COUPONS = [
  {
    code: "CARE35",
    percent: 35,
    label: "35% off MRP",
  },
  {
    code: "WELCOME10",
    percent: 10,
    label: "10% off MRP",
  },
  {
    code: "FAMILY20",
    percent: 20,
    label: "20% off MRP",
  },
  {
    code: "SAVE100",
    amount: 100,
    label: "₹100 off",
  },
];

export function normalizeCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function findCoupon(code) {
  const key = normalizeCouponCode(code);
  if (!key) return null;
  return COUPONS.find((row) => row.code === key) || null;
}

export function couponDiscountOnSale(coupon, saleRupees) {
  const sale = Math.max(0, Number(saleRupees) || 0);
  if (!coupon || sale <= 0) return 0;
  if (coupon.percent) {
    return Math.min(sale, (sale * Number(coupon.percent)) / 100);
  }
  return Math.min(sale, Math.max(0, Number(coupon.amount) || 0));
}

export function applyCoupon(code, saleRupees) {
  const coupon = findCoupon(code);
  if (!coupon) {
    return { ok: false, error: "This coupon is not valid." };
  }
  return {
    ok: true,
    coupon,
    discountRupees: couponDiscountOnSale(coupon, saleRupees),
  };
}
