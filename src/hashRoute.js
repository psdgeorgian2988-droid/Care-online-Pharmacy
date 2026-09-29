export function parseAppHash(rawHash) {
  let value = rawHash || "";
  if (value.startsWith("#")) {
    value = value.slice(1);
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    value = value.replace(/%3F/gi, "?").replace(/%3D/gi, "=");
  }
  const queryIndex = value.indexOf("?");
  const path = (queryIndex === -1 ? value : value.slice(0, queryIndex))
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase();
  const query = queryIndex === -1 ? "" : value.slice(queryIndex + 1);
  let q = "";
  let id = "";
  let step = "";
  let plan = "";
  let service = "";
  let lab = "";
  let section = "";
  try {
    const params = new URLSearchParams(query);
    q = (params.get("q") || "").trim();
    id = (params.get("id") || "").trim();
    step = (params.get("step") || "").trim();
    plan = (params.get("plan") || "").trim();
    service = (params.get("service") || "").trim();
    lab = (params.get("lab") || "").trim();
    section = (params.get("section") || "").trim().toLowerCase();
  } catch {
    q = "";
    id = "";
    step = "";
    plan = "";
    service = "";
    lab = "";
    section = "";
  }
  const HASH_ALIASES = {
    social: "contact",
    ops: "admin",
    partners: "partner",
    partnerdesk: "partner-desk",
    pharmacy: "pharmacy-desk",
    pharmacydesk: "pharmacy-desk",
    delivery: "delivery-desk",
    deliverydesk: "delivery-desk",
    labdesk: "lab-desk",
    radiologydesk: "radiology-desk",
    homecaredesk: "homecare-desk",
    vaccinationdesk: "vaccination-desk",
    psychologistdesk: "psychologist-desk",
    doctordesk: "doctor-desk",
    ambulancedesk: "ambulance-desk",
    stepdowndesk: "stepdown-desk",
    app: "portals",
    apps: "portals",
    "medical-record": "reports",
    medicalrecord: "reports",
    vaccination: "home",
    "home-records": "home",
    homerecords: "home",
  };
  const mapped = HASH_ALIASES[path] || path;
  const route = !mapped || mapped === "home" ? "#home" : `#${mapped}`;
  const recordsSection =
    section === "records" ||
    section === "record" ||
    section === "medical-record" ||
    section === "reports";
  const HOME_SERVICE_ALIASES = {
    medicines: "medicine",
    records: "reports",
    record: "reports",
    "medical-record": "reports",
  };
  const resolvedService =
    path === "vaccination"
      ? "vaccination"
      : path === "home-records" || path === "homerecords" || (route === "#home" && recordsSection)
        ? "reports"
        : HOME_SERVICE_ALIASES[String(service || "").toLowerCase()] || service;
  return {
    route,
    q,
    id,
    step,
    plan,
    service: resolvedService,
    lab,
  };
}

export const MEDICAL_RECORD_HOME_HASH = "#home?service=reports";
export const LABS_HOME_HASH = "#home?service=labs";

/** Labs hub card → that partner’s booking page (`#labs?service=lab&lab=metropolis`). */
export function labBookingHash(labId, service = "lab") {
  const kind = String(service || "").toLowerCase() === "radiology" ? "radiology" : "lab";
  const id = String(labId || "").trim();
  if (!id) return "#labs";
  return `#labs?service=${encodeURIComponent(kind)}&lab=${encodeURIComponent(id)}`;
}
export const MEDICINE_HOME_HASH = "#home?service=medicine";
export const HOMECARE_HOME_HASH = "#home?service=homecare";
export const DOCTOR_HOME_HASH = "#home?service=doctor";
export const VACCINATION_HOME_HASH = "#home?service=vaccination";

export function isMedicalRecordNavActive(route, service = "") {
  const key = String(service || "").toLowerCase();
  if (route === "#reports") return true;
  return route === "#home" && key === "reports";
}

export function isLabsNavActive(route, service = "") {
  if (route === "#labs") return true;
  const key = String(service || "").toLowerCase();
  return route === "#home" && (key === "labs" || key === "lab" || key === "radiology");
}

export function isMedicineNavActive(route, service = "") {
  if (route === "#medicine-search") return true;
  return route === "#home" && String(service || "").toLowerCase() === "medicine";
}

export function isHomecareNavActive(route, service = "") {
  if (route === "#homecare") return true;
  return route === "#home" && String(service || "").toLowerCase() === "homecare";
}

export function isDoctorNavActive(route, service = "") {
  if (route === "#doctor") return true;
  return route === "#home" && String(service || "").toLowerCase() === "doctor";
}

export function isVaccinationNavActive(route, service = "") {
  const key = String(service || "").toLowerCase();
  if (route === "#home") return key === "vaccination";
  return route === "#vaccination" && (key === "vaccination" || !key);
}

const EDUCATION_TABS = new Set(["guides", "webinars", "quiz", "refer"]);
const MY_ORDER_SERVICES = new Set([
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "doctor",
  "psychologist",
  "stepdown",
  "ambulance",
]);
const HOME_SECTIONS = new Set([
  "medicine",
  "labs",
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "doctor",
  "psychologist",
  "stepdown",
  "ambulance",
  "reports",
  "education",
]);

function isCustomerKindService(service) {
  return MY_ORDER_SERVICES.has(String(service || "").toLowerCase());
}

export function isHomeSectionKey(key) {
  return HOME_SECTIONS.has(String(key || "").trim());
}

export function homeCatalogSectionKeys(service) {
  const key = String(service || "").trim().toLowerCase();
  if (key === "labs") return ["lab", "radiology"];
  return isHomeSectionKey(key) ? [key] : [];
}

export function normalizeAppHash(nextHash) {
  if (!nextHash) return "#home";
  return nextHash.startsWith("#") ? nextHash : `#${nextHash}`;
}

export function hashesMatch(leftHash, rightHash) {
  const left = parseAppHash(leftHash);
  const right = parseAppHash(rightHash);
  return (
    left.route === right.route &&
    left.q === right.q &&
    left.id === right.id &&
    left.step === right.step &&
    left.plan === right.plan &&
    left.service === right.service &&
    left.lab === right.lab
  );
}

export function educationRouteFromHash(rawHash) {
  const { service, id } = parseAppHash(rawHash);
  const tab = EDUCATION_TABS.has(service) ? service : "";
  return {
    tab,
    sessionId: tab === "webinars" ? id : "",
    quizId: tab === "quiz" ? id : "",
  };
}

export function sectionParentHash(sectionKey) {
  const key = String(sectionKey || "").trim();
  return isHomeSectionKey(key) ? `#home?service=${key}` : "#home";
}

export function catalogParentHash(sectionKey, currentHash = "") {
  const current = parseAppHash(currentHash);
  if (sectionKey === "lab" || sectionKey === "radiology") {
    if (current.route === "#labs") return "#labs";
    if (current.route === "#home" && current.service === "labs") return LABS_HOME_HASH;
  }
  if (current.route === "#home" && current.service === sectionKey) {
    return sectionParentHash(sectionKey);
  }
  return sectionParentHash(sectionKey);
}

export function parentHashFor(rawHash) {
  const { route, service, lab, id, plan, q } = parseAppHash(rawHash);

  if (route === "#home") {
    return service ? "#home" : "";
  }

  if (route === "#education") {
    return service || id ? sectionParentHash("education") : "#home";
  }

  if (route === "#labs") {
    return lab ? "#labs" : "#home";
  }

  if (route === "#homecare") {
    if (plan === "vaccination" || plan === "vaccination-child") {
      return sectionParentHash("vaccination");
    }
    return service || plan ? sectionParentHash("homecare") : "#home";
  }

  if (route === "#reports") {
    if (id) {
      return service ? `#reports?service=${encodeURIComponent(service)}` : "#reports";
    }
    if (service) return MEDICAL_RECORD_HOME_HASH;
    return MEDICAL_RECORD_HOME_HASH;
  }

  if (route === "#doctor") {
    return service ? sectionParentHash("doctor") : "#home";
  }
  if (route === "#psychologist") {
    return service ? sectionParentHash("psychologist") : "#home";
  }
  if (route === "#stepdown") {
    return service ? sectionParentHash("stepdown") : "#home";
  }
  if (route === "#ambulance") {
    return service ? sectionParentHash("ambulance") : "#home";
  }
  if (route === "#medicine-search") {
    return service || q ? sectionParentHash("medicine") : "#home";
  }
  if (route === "#myorders") {
    if (id) {
      return isCustomerKindService(service)
        ? `#myorders?service=${encodeURIComponent(service)}`
        : "#myorders";
    }
    return service ? "#myorders" : "#home";
  }
  if (route === "#profile") {
    return service ? "#profile" : "#home";
  }

  return "#home";
}

function hashUrl(hash) {
  return `${window.location.pathname}${window.location.search}${normalizeAppHash(hash)}`;
}

function notifyHashChange() {
  if (typeof HashChangeEvent === "function") {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.dispatchEvent(new Event("hashchange"));
}

export function goToHash(nextHash) {
  const hash = normalizeAppHash(nextHash);
  if (typeof window === "undefined") return;
  if (hashesMatch(window.location.hash || "#home", hash)) return;
  window.history.pushState(null, "", hashUrl(hash));
  notifyHashChange();
}

export function goToChildHash(childHash, parentHash = "") {
  const child = normalizeAppHash(childHash);
  const parent = parentHash ? normalizeAppHash(parentHash) : parentHashFor(child);
  if (typeof window === "undefined") return;
  const current = window.location.hash || "#home";
  if (hashesMatch(current, child)) return;
  if (parent && !hashesMatch(current, parent) && !hashesMatch(parent, child)) {
    window.history.pushState(null, "", hashUrl(parent));
  }
  window.history.pushState(null, "", hashUrl(child));
  notifyHashChange();
}

export function goBackHash() {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }
  goToHash(parentHashFor(window.location.hash || "#home") || "#home");
}
