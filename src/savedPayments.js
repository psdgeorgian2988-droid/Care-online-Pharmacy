import { normalizeMobile } from "./personFields.js";
import {
  cardBrand,
  cardDigits,
  isValidIfsc,
  isValidUpi,
  last4,
} from "./paymentMethods.js";

const STORAGE_KEY = "mediHomeSavedPayments";

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadSavedPayments(mobile, type = "") {
  const key = normalizeMobile(mobile);
  if (!key) return [];
  const list = Array.isArray(readStore()[key]) ? readStore()[key] : [];
  const wanted = String(type || "").toLowerCase();
  return wanted ? list.filter((row) => row.type === wanted) : list;
}

export function toStoredInstrument(method, details = {}) {
  const kind = String(method || "").toLowerCase();
  if (kind === "upi") {
    const upiId = String(details.upiId || "")
      .trim()
      .toLowerCase();
    if (!isValidUpi(upiId)) return null;
    return {
      id: details.savedId || `pay-${Date.now()}`,
      type: "upi",
      upiId,
      label: upiId,
    };
  }
  if (kind === "credit" || kind === "debit") {
    const digits = cardDigits(details.cardNumber);
    const cardLast4 = details.cardLast4 || last4(digits);
    if (!cardLast4) return null;
    return {
      id: details.savedId || `pay-${Date.now()}`,
      type: kind,
      cardLast4,
      cardBrand: details.cardBrand || cardBrand(digits),
      nameOnCard: String(details.nameOnCard || "").trim(),
      expiryMonth: String(details.expiryMonth || ""),
      expiryYear: String(details.expiryYear || ""),
      label: `${details.cardBrand || cardBrand(digits)} •••• ${cardLast4}`,
    };
  }
  if (kind === "bank") {
    const account = cardDigits(details.accountNumber);
    const accountLast4 = details.accountLast4 || last4(account);
    const ifsc = String(details.ifsc || "")
      .trim()
      .toUpperCase();
    if (!accountLast4 || !isValidIfsc(ifsc)) return null;
    return {
      id: details.savedId || `pay-${Date.now()}`,
      type: "bank",
      accountLast4,
      ifsc,
      accountName: String(details.accountName || "").trim(),
      label: `${ifsc} •••• ${accountLast4}`,
    };
  }
  return null;
}

export function savePaymentInstrument(mobile, method, details, { consent } = {}) {
  if (!consent) return null;
  const key = normalizeMobile(mobile);
  const stored = toStoredInstrument(method, details);
  if (!key || !stored) return null;
  if (stored.cardNumber || stored.cvv || stored.accountNumber) return null;
  const store = readStore();
  const list = Array.isArray(store[key]) ? store[key] : [];
  const next = [stored, ...list.filter((row) => row.label !== stored.label)].slice(0, 8);
  store[key] = next;
  writeStore(store);
  return stored;
}
