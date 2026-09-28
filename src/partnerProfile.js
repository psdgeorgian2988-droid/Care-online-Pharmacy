import { isValidIfsc } from "./paymentMethods.js";

export const PARTNER_SERVICE_OPTIONS = [
  { key: "medicine", label: "Pharmacy / Medicine" },
  { key: "lab", label: "Laboratory Test" },
  { key: "radiology", label: "Radiology & Imaging" },
  { key: "homecare", label: "Home Care" },
  { key: "physiotherapy", label: "Physiotherapy" },
  { key: "psychologist", label: "Psychologist Consultation" },
  { key: "ambulance", label: "Ambulance" },
  { key: "stepdown", label: "Step-Down Care" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOnly(value, max = 10) {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function loginIdFromContact(mobile, email) {
  const digits = digitsOnly(mobile, 10);
  const local = normalizeEmail(email)
    .split("@")[0]
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  if (local && digits.length >= 4) {
    return `${local}.${digits.slice(-4)}`.slice(0, 40);
  }
  if (local) return local.slice(0, 40);
  if (digits.length === 10) return digits;
  return "";
}

export function uniqueLoginId(used, candidate) {
  const base = String(candidate || "").toLowerCase();
  if (!base) return "";
  const taken = new Set(
    (Array.isArray(used) ? used : []).map((row) => String(row || "").toLowerCase())
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const next = `${base.slice(0, 36)}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`.slice(0, 40);
}

export function needsHomeVisitDocs(kinds = [], physiotherapy = false) {
  const list = Array.isArray(kinds) ? kinds : [kinds];
  return physiotherapy || list.includes("homecare") || list.includes("physiotherapy");
}

export function kindsFromServices(selected = [], physiotherapy = false) {
  const list = Array.isArray(selected) ? selected : [selected];
  const kinds = [];
  for (const key of list) {
    if (key === "physiotherapy") {
      if (!kinds.includes("homecare")) kinds.push("homecare");
      continue;
    }
    if (key && !kinds.includes(key)) kinds.push(key);
  }
  if (physiotherapy && !kinds.includes("homecare")) kinds.push("homecare");
  return kinds.length ? kinds : ["medicine"];
}

export function roleForPartner({ kinds = [], physiotherapy = false, businessName = "" } = {}) {
  if (kinds.length === 1 && kinds[0] === "medicine") {
    return businessName ? "Pharmacy" : "Medicine Rider";
  }
  if (physiotherapy && kinds.every((kind) => kind === "homecare")) return "Physiotherapist";
  if (kinds.length === 1) {
    switch (kinds[0]) {
      case "lab":
        return "Phlebotomist";
      case "radiology":
        return "Radiology Centre";
      case "homecare":
        return "Home Care Professional";
      case "psychologist":
        return "Psychologist";
      case "ambulance":
        return "Ambulance Operator";
      case "stepdown":
        return "Step-Down Centre";
      default:
        break;
    }
  }
  return "Partner";
}

export function displayPartnerName({ businessName = "", contactName = "", name = "" } = {}) {
  return String(businessName || name || contactName || "").trim();
}

export function validatePartnerOnboard(body = {}) {
  const kinds = kindsFromServices(body.kinds || body.services, body.physiotherapy);
  const physiotherapy = Boolean(body.physiotherapy || (body.kinds || []).includes("physiotherapy"));
  const contactName = String(body.contactName || "").replace(/\s+/g, " ").trim();
  const businessName = String(body.businessName || "").replace(/\s+/g, " ").trim();
  const mobile = digitsOnly(body.mobile, 10);
  const email = normalizeEmail(body.email);
  const pinCode = digitsOnly(body.pinCode || body.pin, 6);
  const houseNo = String(body.houseNo || "").trim();
  const society = String(body.society || "").trim();
  const accountName = String(body.accountName || "").replace(/\s+/g, " ").trim();
  const accountNumber = digitsOnly(body.accountNumber, 18);
  const ifsc = String(body.ifsc || "").trim().toUpperCase();
  const hasAadhaar = Boolean(body.aadhaarFile || body.aadhaar?.data || body.aadhaar?.dataUrl);
  const hasPolice = Boolean(
    body.policeFile || body.policeVerification?.data || body.policeVerification?.dataUrl
  );

  if (!kinds.length) return "Select At Least One Service.";
  if (kinds.includes("medicine") && !businessName) {
    return "Enter The Pharmacy / Business Name.";
  }
  if (!contactName) return "Enter The Concerned Person Name.";
  if (mobile.length !== 10) return "Enter A 10-Digit Mobile Number.";
  if (!EMAIL_RE.test(email)) return "Enter A Valid Email ID.";
  if (pinCode.length !== 6) return "Enter A 6-Digit PIN Code.";
  if (!houseNo && !society) return "Enter The Address With House Or Society Details.";
  if (!accountName) return "Enter The Account Holder Name.";
  if (accountNumber.length < 9 || accountNumber.length > 18) {
    return "Enter A Valid Bank Account Number.";
  }
  if (!isValidIfsc(ifsc)) return "Enter A Valid IFSC Code.";
  if (needsHomeVisitDocs(kinds, physiotherapy) && !hasAadhaar) {
    return "Upload The Aadhaar Card Photo For Home Visit Services.";
  }
  if (needsHomeVisitDocs(kinds, physiotherapy) && !hasPolice) {
    return "Upload The Police Verification For Home Visit Services.";
  }
  return "";
}
