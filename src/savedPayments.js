import { normalizeMobile } from "./personFields.js";
import {
  cardBrand,
  cardDigits,
  cardFundingLabel,
  detectCardFunding,
  isCardPayment,
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
  if (!wanted) return list;
  if (isCardPayment(wanted)) {
    return list.filter((row) => isCardPayment(row.type));
  }
  return list.filter((row) => row.type === wanted);
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
  if (isCardPayment(kind)) {
    const digits = cardDigits(details.cardNumber);
    const cardLast4 = details.cardLast4 || last4(digits);
    if (!cardLast4) return null;
    const brand = details.cardBrand || cardBrand(digits);
    const funding = details.cardFunding || detectCardFunding(digits);
    const fundingText = cardFundingLabel(funding);
    return {
      id: details.savedId || `pay-${Date.now()}`,
      type: "card",
      cardLast4,
      cardBrand: brand,
      cardFunding: funding,
      nameOnCard: String(details.nameOnCard || "").trim(),
      expiryMonth: String(details.expiryMonth || ""),
      expiryYear: String(details.expiryYear || ""),
      label: `${brand}${fundingText ? ` ${fundingText}` : ""} •••• ${cardLast4}`,
    };
  }
  if (kind === "bank") {
    const account = cardDigits(details.accountNumber);
    const accountLast4 = details.accountLast4 || last4(account);
    const ifsc = String(details.ifsc || "")
      .trim()
      .toUpperCase();
    if (!accountLast4 || !isValidIfsc(ifsc)) return null;
    const bankName = String(details.bankName || "").trim();
    return {
      id: details.savedId || `pay-${Date.now()}`,
      type: "bank",
      accountLast4,
      ifsc,
      bankName,
      accountName: String(details.accountName || "").trim(),
      label: `${bankName || ifsc} •••• ${accountLast4}`,
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
