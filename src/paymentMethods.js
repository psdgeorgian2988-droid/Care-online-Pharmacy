export const ONLINE_PAYMENT_METHODS = [
  "online",
  "upi",
  "qr",
  "scan",
  "share",
  "card",
  "credit",
  "debit",
  "bank",
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cod", label: "Cash On Visit" },
  { value: "upi", label: "UPI" },
  { value: "qr", label: "QR Code" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank Account" },
];

export function isCardPayment(method) {
  return ["card", "credit", "debit"].includes(String(method || "").toLowerCase());
}

export function isOnlinePayment(method) {
  return ONLINE_PAYMENT_METHODS.includes(String(method || "").toLowerCase());
}

export function paymentMethodLabel(method, cashLabel = "Cash On Visit") {
  const key = String(method || "").toLowerCase();
  if (key === "upi") return "UPI";
  if (key === "qr" || key === "scan" || key === "share") return "QR Code";
  if (key === "card") return "Card";
  if (key === "credit") return "Credit Card";
  if (key === "debit") return "Debit Card";
  if (key === "bank") return "Bank Account";
  if (key === "online") return "Online";
  if (key === "split") return "Split payment";
  return cashLabel;
}

export function paymentMethodSummary(method, cashLabel = "Cash On Delivery / Visit") {
  const key = String(method || "").toLowerCase();
  if (!isOnlinePayment(key)) return cashLabel;
  if (key === "online") return "Paid Online";
  return `Paid By ${paymentMethodLabel(key)}`;
}

export function isCashOnDeliveryMethod(method, payment) {
  const key = String(method || payment?.paymentMethod || "").toLowerCase();
  if (key === "cod" || key === "cash") return true;
  if (key.includes("cash on") || key.includes("cash-on")) return true;
  const status = String(payment?.paymentStatus || "").toLowerCase();
  return status === "cod";
}

export function isPaidCheckoutMethod(method, payment) {
  if (payment?.paid) return true;
  const status = String(payment?.paymentStatus || "").toLowerCase();
  if (status === "paid") return true;
  if (isCashOnDeliveryMethod(method, payment)) return false;
  const key = String(method || payment?.paymentMethod || "").toLowerCase();
  return key !== "pending" && Boolean(key);
}

export function checkoutUsesPayCta(method, payment) {
  return isPaidCheckoutMethod(method, payment);
}

export function showCustomerPayNow(order = {}) {
  if (order?.paid === true) return false;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return false;
  if (isCashOnDeliveryMethod(order?.paymentMethod, order)) return false;
  return true;
}

export function customerPaidAtCheckout(order = {}, paidFlag) {
  if (paidFlag === true || order?.paid === true) return true;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return true;
  if (isCashOnDeliveryMethod(order?.paymentMethod, order)) return false;
  if (String(order?.paidOn || "").toLowerCase() === "customer") return true;
  if (String(order?.collector || "").toLowerCase() === "medihome") return true;
  return false;
}

export function checkoutPaymentPersistFields(method, payment = {}) {
  const paid = isPaidCheckoutMethod(method, payment);
  return {
    ...payment,
    paid,
    paymentStatus: paid
      ? payment.paymentStatus || "paid"
      : payment.paymentStatus || "cod",
    paidOn: paid ? payment.paidOn || "customer" : "later",
  };
}

export function persistUnsettledCheckoutFields(method) {
  if (isCashOnDeliveryMethod(method)) {
    return checkoutPaymentPersistFields(method, { paymentMethod: method || "cod" });
  }
  return {
    paymentMethod: method || "pending",
    paymentStatus: "awaiting_payment",
    paid: false,
  };
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

export function paymentUpiUri({ amount, kind, pa, pn, tn, orderId } = {}) {
  const am = Math.max(0, Number(amount) || 0).toFixed(2);
  const payee = isValidUpi(pa) ? String(pa).trim().toLowerCase() : "medihome@upi";
  const note = String(
    tn || `MediHome ${kind || "payment"}${orderId ? ` ${orderId}` : ""}`
  ).slice(0, 50);
  const params = new URLSearchParams({
    pa: payee,
    pn: String(pn || "MediHome").slice(0, 99),
    am,
    cu: "INR",
    tn: note,
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
  if (digits.startsWith("34") || digits.startsWith("37")) return "Amex";
  if (digits.startsWith("3")) return "Amex";
  return "Card";
}

/** Visa Electron / Maestro / typical Indian RuPay — debit. Longer prefixes first. */
const DEBIT_IIN = [
  "417500",
  "4175",
  "4026",
  "4405",
  "4508",
  "4844",
  "4913",
  "4917",
  "5018",
  "5020",
  "5038",
  "5893",
  "6304",
  "6759",
  "6761",
  "6762",
  "6763",
  "508",
  "60",
  "65",
  "81",
  "82",
];

/** Amex / Diners — credit. */
const CREDIT_IIN = ["34", "37", "36", "38", "300", "301", "302", "303", "304", "305"];

function matchesIin(digits, prefixes) {
  return prefixes.some((prefix) => digits.startsWith(prefix));
}

/** Debit vs credit from BIN/IIN prefixes. Empty until 4 digits are typed. */
export function detectCardFunding(value) {
  const digits = cardDigits(value);
  if (digits.length < 4) return "";
  if (matchesIin(digits, DEBIT_IIN)) return "debit";
  if (matchesIin(digits, CREDIT_IIN)) return "credit";
  if (digits.startsWith("4") || /^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
    return "credit";
  }
  if (digits.startsWith("6") || digits.startsWith("8")) return "debit";
  return "";
}

export function cardFundingLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "debit") return "Debit";
  if (key === "credit") return "Credit";
  return "";
}

export function formatCardExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function parseCardExpiry(value) {
  const text = String(value || "").trim();
  const matched = text.match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  const digits = text.replace(/\D/g, "");
  let month = 0;
  let year = 0;
  if (matched) {
    month = Number(matched[1]);
    year = Number(matched[2]);
  } else if (digits.length === 4) {
    month = Number(digits.slice(0, 2));
    year = Number(digits.slice(2));
  }
  if (year > 0 && year < 100) year += 2000;
  return { month, year };
}

const IFSC_BANK_NAMES = {
  HDFC: "HDFC Bank",
  SBIN: "State Bank of India",
  ICIC: "ICICI Bank",
  UTIB: "Axis Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  BARB: "Bank of Baroda",
  KKBK: "Kotak Mahindra Bank",
  IDIB: "Indian Bank",
  IOBA: "Indian Overseas Bank",
  UBIN: "Union Bank of India",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
  FDRL: "Federal Bank",
  BKID: "Bank of India",
};

export function bankNameFromIfsc(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 4);
  return IFSC_BANK_NAMES[code] || "";
}

export function last4(value) {
  return cardDigits(value).slice(-4);
}

export function emptyPaymentDetails() {
  return {
    upiId: "",
    cardNumber: "",
    nameOnCard: "",
    expiry: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardFunding: "",
    cardBrand: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    savedId: "",
  };
}

export function paymentDetailsReady(method, details = {}) {
  return !validatePaymentDetails(method, details);
}

export function paymentInstrumentPublicFields(method, details = {}) {
  const key = String(method || "").toLowerCase();
  const out = {};
  if (isCardPayment(key)) {
    const digits = cardDigits(details.cardNumber);
    const last = details.cardLast4 || last4(digits);
    if (last) out.cardLast4 = last;
    const brand = details.cardBrand || (digits ? cardBrand(digits) : "");
    if (brand) out.cardBrand = brand;
    const funding = details.cardFunding || detectCardFunding(digits);
    if (funding) out.cardFunding = funding;
  }
  if (key === "bank") {
    const last = details.accountLast4 || last4(details.accountNumber);
    if (last) out.accountLast4 = last;
    const ifsc = String(details.ifsc || "")
      .trim()
      .toUpperCase();
    if (ifsc) out.ifsc = ifsc;
    const bankName = String(details.bankName || bankNameFromIfsc(ifsc) || "").trim();
    if (bankName) out.bankName = bankName;
    const name = String(details.accountName || "").trim();
    if (name) out.accountName = name;
  }
  return out;
}

export function validatePaymentDetails(method, details = {}) {
  const key = String(method || "").toLowerCase();
  if (!isOnlinePayment(key) || key === "online") return "";
  if (key === "upi") {
    return isValidUpi(details.upiId) ? "" : "Enter a valid UPI ID.";
  }
  if (key === "qr" || key === "scan" || key === "share") return "";
  if (isCardPayment(key)) {
    const digits = cardDigits(details.cardNumber);
    const cvv = String(details.cvv || "").replace(/\D/g, "");
    if (details.savedId) {
      if (!/^\d{3,4}$/.test(cvv)) return "Enter the CVV to use this saved card.";
      return "";
    }
    const brand = cardBrand(digits);
    if (brand === "Amex" ? digits.length !== 15 : digits.length < 16 || digits.length > 19) {
      return "Enter a valid card number.";
    }
    if (!String(details.nameOnCard || "").trim()) return "Enter the name on the card.";
    const parsed = details.expiry
      ? parseCardExpiry(details.expiry)
      : { month: Number(details.expiryMonth), year: Number(details.expiryYear) };
    const month = Number(parsed.month);
    const year = Number(parsed.year);
    if (!month || month < 1 || month > 12 || !year) return "Enter the expiry as MM/YY.";
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return "This card has expired.";
    }
    const amex = brand === "Amex";
    if (amex ? !/^\d{3,4}$/.test(cvv) : !/^\d{3}$/.test(cvv)) {
      return "Enter the 3-digit CVV.";
    }
    return "";
  }
  if (key === "bank") {
    if (details.savedId) {
      if (!isValidIfsc(details.ifsc)) return "Enter a valid IFSC.";
      return "";
    }
    if (!String(details.accountName || "").trim()) return "Enter the account holder name.";
    const account = cardDigits(details.accountNumber);
    if (account.length < 9 || account.length > 18) return "Enter a valid account number.";
    if (!isValidIfsc(details.ifsc)) return "Enter a valid IFSC.";
    return "";
  }
  return "";
}
