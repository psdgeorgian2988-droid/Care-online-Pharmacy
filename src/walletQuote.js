import { isPaidCheckoutMethod } from "./paymentMethods.js";

export const COINS_PER_RUPEE = 10;
export const REDEEM_MIN_POINTS = 500;
export const REDEEM_INTENT_KEY = "mediHomeRedeemAtCheckout";

export function roundRupees(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function coinsToRupees(coins) {
  const n = Math.max(0, Math.floor(Number(coins) || 0));
  return Math.floor(n / COINS_PER_RUPEE);
}

export function pointsToRupees(points) {
  return coinsToRupees(points);
}

export function canRedeemPoints(points) {
  return Math.max(0, Math.floor(Number(points) || 0)) > REDEEM_MIN_POINTS;
}

export function pointsRedeemPanel(points) {
  const balance = Math.max(0, Math.floor(Number(points) || 0));
  const canRedeem = canRedeemPoints(balance);
  const rupees = canRedeem ? pointsToRupees(balance) : 0;
  return {
    balance,
    canRedeem,
    rupees,
  };
}

export function pointsRedeemAllowedForKind(kind) {
  return String(kind || "").toLowerCase() !== "medicine";
}

export function pointsRedeemAllowedAtCheckout({
  kind,
  points,
  method,
  eligibleRupees,
} = {}) {
  if (!pointsRedeemAllowedForKind(kind)) return false;
  if (!canRedeemPoints(points)) return false;
  if (Math.max(0, Number(eligibleRupees) || 0) <= 0) return false;
  return isPaidCheckoutMethod(method);
}

export function setRedeemIntent(on = true) {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (on) sessionStorage.setItem(REDEEM_INTENT_KEY, "1");
    else sessionStorage.removeItem(REDEEM_INTENT_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasRedeemIntent() {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(REDEEM_INTENT_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function allocatePointsAcrossServices(
  totals = [],
  pointsDiscountRupees = 0,
  pointsUsed = 0
) {
  const amounts = totals.map((n) => Math.max(0, Number(n) || 0));
  let leftDiscount = Math.max(0, Number(pointsDiscountRupees) || 0);
  let leftUsed = Math.max(0, Math.floor(Number(pointsUsed) || 0));
  return amounts.map((total, index) => {
    const last = index === amounts.length - 1;
    const takeDiscount = Math.min(leftDiscount, last ? leftDiscount : total);
    const takeUsed =
      takeDiscount <= 0
        ? 0
        : last
          ? leftUsed
          : Math.min(leftUsed, rupeesToCoins(takeDiscount));
    leftDiscount = Math.max(0, leftDiscount - takeDiscount);
    leftUsed = Math.max(0, leftUsed - takeUsed);
    return {
      pointsDiscountRupees: takeDiscount,
      pointsUsed: takeUsed,
    };
  });
}

export function rupeesToCoins(rupees) {
  return Math.max(0, Math.round(roundRupees(rupees) * COINS_PER_RUPEE));
}

export function quoteWalletSpend({
  moneyRupees = 0,
  coins = 0,
  remainingRupees = 0,
} = {}) {
  const remaining = Math.max(0, roundRupees(remainingRupees));
  const money = Math.min(Math.max(0, roundRupees(moneyRupees)), remaining);
  const afterMoney = roundRupees(remaining - money);
  const coinRupees = Math.min(coinsToRupees(coins), afterMoney);
  const coinsUsed = Math.min(
    Math.max(0, Math.floor(Number(coins) || 0)),
    rupeesToCoins(coinRupees)
  );
  const fromCoins = coinsToRupees(coinsUsed);
  return {
    moneyRupees: money,
    coins: coinsUsed,
    rupees: roundRupees(money + fromCoins),
  };
}
