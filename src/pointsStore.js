import { useEffect, useState } from "react";
import { pickFamilyMembers } from "./personFields.js";
import { SITE } from "./siteMeta.js";

const STORAGE_KEY = "mediHomePointsWallet";
export const POINTS_EVENT = "medihome-points";

export const POINT_VALUES = {
  webinar: 10,
  quiz: 20,
  referral: 50,
  providerReferral: 100,
  familyMember: 10,
};

export const PROVIDER_SERVICES = [
  { value: "nurse", label: "Nurse" },
  { value: "caregiver", label: "Home Care / Caregiver" },
  { value: "physiotherapy", label: "Physiotherapist" },
  { value: "ambulance", label: "Ambulance" },
  { value: "psychologist", label: "Psychologist Consultant" },
];

function emptyWallet() {
  return {
    balance: 0,
    lifetime: 0,
    ledger: [],
    earned: {},
    referrals: [],
    providerReferrals: [],
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
      providerReferrals: Array.isArray(parsed.providerReferrals)
        ? parsed.providerReferrals
        : [],
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

export function awardFamilyMemberPoints(members = []) {
  const complete = pickFamilyMembers({ familyMembers: members }).filter(
    (row) => row.id && row.name && row.gender && row.dob
  );
  let awarded = 0;
  let count = 0;
  for (const member of complete) {
    const result = awardOnce(
      `family:${member.id}`,
      POINT_VALUES.familyMember,
      `Family member added: ${member.name}`
    );
    if (!result.already && result.awarded) {
      awarded += result.awarded;
      count += 1;
    }
  }
  return { awarded, count, wallet: loadWallet() };
}

export function saveReferralInvite({ name, mobile }) {
  const wallet = loadWallet();
  const now = new Date();
  const code = "MH-FAM-" + Math.floor(1000 + Math.random() * 9000);
  const referral = {
    id: code,
    name: String(name || "").trim(),
    mobile: String(mobile || "").replace(/\D/g, "").slice(-10),
    pointsUsed: 0,
    at: now.toLocaleString(),
    atMs: now.getTime(),
  };
  wallet.referrals.unshift(referral);
  persist(wallet);
  return { ok: true, referral, wallet };
}

/** @deprecated Use saveReferralInvite. Family/friend invites no longer spend points. */
export function spendForReferral(payload) {
  return saveReferralInvite(payload);
}

export function providerServiceLabel(kind) {
  return PROVIDER_SERVICES.find((row) => row.value === kind)?.label || "Service provider";
}

export function referServiceProvider({ name, mobile, serviceKind, city = "", pinCode = "" }) {
  const kind = String(serviceKind || "").trim();
  const allowed = PROVIDER_SERVICES.some((row) => row.value === kind);
  if (!allowed) return { ok: false, reason: "kind" };
  const wallet = loadWallet();
  const key = `provider:${kind}:${mobile}`;
  const already = (wallet.providerReferrals || []).find(
    (row) => row.mobile === mobile && row.serviceKind === kind
  );
  if (already || wallet.earned[key]) {
    return { ok: false, reason: "duplicate", referral: already || null, wallet };
  }
  const now = new Date();
  const amount = POINT_VALUES.providerReferral;
  const referral = {
    id: "MH-REF-" + Math.floor(1000 + Math.random() * 9000),
    name,
    mobile,
    serviceKind: kind,
    serviceLabel: providerServiceLabel(kind),
    city: String(city || "").trim(),
    pinCode: String(pinCode || "").replace(/\D/g, "").slice(0, 6),
    pointsAwarded: amount,
    at: now.toLocaleString(),
    atMs: now.getTime(),
  };
  wallet.earned[key] = true;
  wallet.balance += amount;
  wallet.lifetime += amount;
  wallet.providerReferrals.unshift(referral);
  wallet.ledger.unshift({
    id: "MH-PT-" + now.getTime(),
    type: "earn",
    amount,
    label: `Provider referral: ${name} (${referral.serviceLabel})`,
    key,
    at: referral.at,
    atMs: referral.atMs,
  });
  persist(wallet);
  return { ok: true, referral, wallet };
}

export function providerReferralShareText(referral, fromName) {
  const who = fromName ? `${fromName} (MediHome customer)` : "a MediHome customer";
  return `Hi ${referral.name}, ${who} referred you to MediHome as a ${referral.serviceLabel}. Join as a partner to take Home Care, ambulance, or psychologist jobs in Delhi NCR. Quote referral ${referral.id} when you call +91 72920 94000.`;
}

export function referralShareText(referral, fromName) {
  const who = fromName ? `${fromName}` : "A MediHome customer";
  const link = SITE.appDownloadUrl || SITE.url;
  return [
    `Hi ${referral.name},`,
    `${who} invited you to MediHome for medicines, lab tests, and home care in Delhi NCR.`,
    `Download the MediHome app: ${link}`,
    referral.id ? `Use family code ${referral.id} when you register.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function referralWhatsAppHref(referral, fromName) {
  const mobile = String(referral?.mobile || "").replace(/\D/g, "").slice(-10);
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(
    referralShareText(referral, fromName)
  )}`;
}
