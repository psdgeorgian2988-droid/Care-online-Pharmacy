export const ONLINE_PAYMENT_METHODS = [
  "online",
  "upi",
  "qr",
  "scan",
  "share",
  "credit",
  "debit",
  "bank",
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cod", label: "Cash On Visit" },
  { value: "upi", label: "UPI" },
  { value: "qr", label: "QR Code" },
  { value: "credit", label: "Credit Card" },
  { value: "debit", label: "Debit Card" },
  { value: "bank", label: "Bank Account" },
];

export function isOnlinePayment(method) {
  return ONLINE_PAYMENT_METHODS.includes(String(method || "").toLowerCase());
}

export function paymentMethodLabel(method, cashLabel = "Cash On Visit") {
  const key = String(method || "").toLowerCase();
  if (key === "upi") return "UPI";
  if (key === "qr" || key === "scan" || key === "share") return "QR Code";
  if (key === "credit") return "Credit Card";
  if (key === "debit") return "Debit Card";
  if (key === "bank") return "Bank Account";
  if (key === "online") return "Online";
  return cashLabel;
}

export function paymentMethodSummary(method, cashLabel = "Cash On Delivery / Visit") {
  const key = String(method || "").toLowerCase();
  if (!isOnlinePayment(key)) return cashLabel;
  if (key === "online") return "Paid Online";
  return `Paid By ${paymentMethodLabel(key)}`;
}

export function isValidUpi(value) {
  return /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(String(value || "").trim());
}

export function parseUpiFromQr(raw) {
  const text = String(raw || "").trim();
  if (isValidUpi(text)) return text.toLowerCase();
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    /* keep raw text */
  }
  const pa = decoded.match(/[?;&]pa=([^&;]+)/i);
  if (pa?.[1]) {
    const id = decodeURIComponent(pa[1]).trim();
    if (isValidUpi(id)) return id.toLowerCase();
  }
  const vpa = decoded.match(/[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}/);
  return vpa && isValidUpi(vpa[0]) ? vpa[0].toLowerCase() : "";
}

export function paymentUpiUri({ amount, kind }) {
  const am = Math.max(0, Number(amount) || 0).toFixed(2);
  const params = new URLSearchParams({
    pa: "medihome@upi",
    pn: "MediHome",
    am,
    cu: "INR",
    tn: `MediHome ${kind || "payment"}`.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

export function paymentShareText({ amount, kind }) {
  const rupees = Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return `Please pay ₹${rupees} for this MediHome ${kind || "order"} booking. Scan the QR with any UPI app.`;
}

export function isValidIfsc(value) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());
}

export function cardDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatCardNumber(value) {
  return cardDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

export function cardBrand(value) {
  const digits = cardDigits(value);
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^6|^8/.test(digits)) return "RuPay";
  if (digits.startsWith("3")) return "Amex";
  return "Card";
}

export function last4(value) {
  return cardDigits(value).slice(-4);
}

export function emptyPaymentDetails() {
  return {
    upiId: "",
    cardNumber: "",
    nameOnCard: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    savedId: "",
  };
}

export function validatePaymentDetails(method, details = {}) {
  const key = String(method || "").toLowerCase();
  if (!isOnlinePayment(key) || key === "online") return "";
  if (key === "upi") {
    return isValidUpi(details.upiId) ? "" : "Enter a valid UPI ID.";
  }
  if (key === "qr" || key === "scan" || key === "share") return "";
  if (key === "credit" || key === "debit") {
    const digits = cardDigits(details.cardNumber);
    if (details.savedId) {
      if (!/^\d{3,4}$/.test(String(details.cvv || "").replace(/\D/g, ""))) {
        return "Enter the CVV to use this saved card.";
      }
      return "";
    }
    if (digits.length < 13 || digits.length > 19) return "Enter a valid card number.";
    if (!String(details.nameOnCard || "").trim()) return "Enter the name on the card.";
    const month = Number(details.expiryMonth);
    const year = Number(details.expiryYear);
    if (!month || !year) return "Enter the card expiry.";
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return "This card has expired.";
    }
    if (!/^\d{3,4}$/.test(String(details.cvv || "").replace(/\D/g, ""))) {
      return "Enter the CVV.";
    }
    return "";
  }
  if (key === "bank") {
    const account = cardDigits(details.accountNumber);
    if (details.savedId) return "";
    if (!String(details.accountName || "").trim()) return "Enter the account holder name.";
    if (account.length < 9 || account.length > 18) return "Enter a valid bank account number.";
    if (!isValidIfsc(details.ifsc)) return "Enter a valid IFSC.";
    return "";
  }
  return "";
}
