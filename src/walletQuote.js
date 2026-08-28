export const COINS_PER_RUPEE = 10;

export function roundRupees(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function coinsToRupees(coins) {
  const n = Math.max(0, Math.floor(Number(coins) || 0));
  return roundRupees(n / COINS_PER_RUPEE);
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
