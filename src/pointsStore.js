import { useEffect, useState } from "react";

const STORAGE_KEY = "mediHomePointsWallet";
export const POINTS_EVENT = "medihome-points";

export const POINT_VALUES = {
  webinar: 10,
  quiz: 20,
  referral: 50,
};

function emptyWallet() {
  return {
    balance: 0,
    lifetime: 0,
    ledger: [],
    earned: {},
    referrals: [],
  };
}

export function loadWallet() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyWallet();
    return {
      ...emptyWallet(),
      ...parsed,
      earned: parsed.earned && typeof parsed.earned === "object" ? parsed.earned : {},
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      balance: Number(parsed.balance) || 0,
      lifetime: Number(parsed.lifetime) || 0,
    };
  } catch {
    return emptyWallet();
  }
}

function persist(wallet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  window.dispatchEvent(new CustomEvent(POINTS_EVENT, { detail: wallet }));
  return wallet;
}

export function subscribeWallet(onChange) {
  const handler = () => onChange(loadWallet());
  window.addEventListener(POINTS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(POINTS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useWallet() {
  const [wallet, setWallet] = useState(loadWallet);
  useEffect(() => subscribeWallet(setWallet), []);
  return wallet;
}

export function hasEarned(key) {
  return Boolean(loadWallet().earned[key]);
}

export function awardOnce(key, amount, label) {
  const wallet = loadWallet();
  if (wallet.earned[key]) {
    return { ok: true, already: true, awarded: 0, wallet };
  }
  const now = new Date();
  wallet.earned[key] = true;
  wallet.balance += amount;
  wallet.lifetime += amount;
  wallet.ledger.unshift({
    id: "MH-PT-" + now.getTime(),
    type: "earn",
    amount,
    label,
    key,
    at: now.toLocaleString(),
    atMs: now.getTime(),
  });
  persist(wallet);
  return { ok: true, already: false, awarded: amount, wallet };
}

export function spendForReferral({ name, mobile, relation }) {
  const amount = POINT_VALUES.referral;
  const wallet = loadWallet();
  if (wallet.balance < amount) {
    return { ok: false, reason: "points", wallet };
  }
  const now = new Date();
  const code = "MH-FAM-" + Math.floor(1000 + Math.random() * 9000);
  const referral = {
    id: code,
    name,
    mobile,
    relation,
    pointsUsed: amount,
    at: now.toLocaleString(),
    atMs: now.getTime(),
  };
  wallet.balance -= amount;
  wallet.referrals.unshift(referral);
  wallet.ledger.unshift({
    id: "MH-PT-" + now.getTime(),
    type: "spend",
    amount: -amount,
    label: `Referral invite: ${name}`,
    key: `refer:${code}`,
    at: referral.at,
    atMs: referral.atMs,
  });
  persist(wallet);
  return { ok: true, referral, wallet };
}

export function referralShareText(referral, fromName) {
  const who = fromName ? `${fromName} (MediHome)` : "a MediHome customer";
  return `Hi ${referral.name}, ${who} invited you to MediHome for medicines, lab tests, and home care in Delhi NCR. Use family code ${referral.id} when you register.`;
}
