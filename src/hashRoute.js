import { staffToken } from "./adminApi.js";
import { readAppRole } from "./appRuntime.js";
import { isPartnerDeskRoute, partnerAppKind, partnerDeskHash } from "./partnerApp.js";
import { partnerSession } from "./partnerApi.js";

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
  let from = "";
  try {
    const params = new URLSearchParams(query);
    q = (params.get("q") || "").trim();
    id = (params.get("id") || "").trim();
    step = (params.get("step") || "").trim();
    plan = (params.get("plan") || "").trim();
    service = (params.get("service") || "").trim();
    lab = (params.get("lab") || "").trim();
    section = (params.get("section") || "").trim().toLowerCase();
    from = (params.get("from") || "").trim().toLowerCase();
  } catch {
    q = "";
    id = "";
    step = "";
    plan = "";
    service = "";
    lab = "";
    section = "";
    from = "";
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
    "staff-orders": "admin",
    stafforders: "admin",
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
    from,
  };
}

export const ADMIN_HOME_HASH = "#admin";

export function adminOrderHash(id) {
  const value = String(id || "").trim();
  return value ? `#admin?id=${encodeURIComponent(value)}` : ADMIN_HOME_HASH;
}

export function isAdminBackHash(rawHash) {
  const { route, from } = parseAppHash(rawHash);
  if (route === "#admin") return true;
  return route === "#track" && (from === "admin" || from === "staff");
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
    left.lab === right.lab &&
    left.from === right.from
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

export const STAFF_ORDERS_ID = "staff-orders";

function partnerHasSession(partner) {
  return Boolean(
    partner &&
      (partner.id ||
        partner.role ||
        (Array.isArray(partner.kinds) && partner.kinds.length))
  );
}

export function readOrderBackContext() {
  let token = "";
  let partner = null;
  let appRole = "";
  try {
    token = staffToken();
  } catch {
    token = "";
  }
  try {
    partner = partnerSession().partner;
  } catch {
    partner = null;
  }
  try {
    appRole = readAppRole();
  } catch {
    appRole = "";
  }
  return { staffToken: token, partner, appRole };
}

export function orderBackActor({
  staffToken: token = "",
  partner = null,
  appRole = "",
  fromHash = "",
  actor = "",
} = {}) {
  if (actor === "admin" || actor === "staff" || actor === "partner" || actor === "customer") {
    return actor === "staff" ? "admin" : actor;
  }
  const hash =
    fromHash || (typeof window !== "undefined" ? window.location.hash || "" : "");
  const parsed = parseAppHash(hash);
  if (parsed.from === "admin" || parsed.from === "staff" || parsed.route === "#admin") {
    return "admin";
  }
  if (String(token || "").trim() || appRole === "staff") {
    return "admin";
  }
  if (partnerHasSession(partner) || appRole === "partner") return "partner";
  return "customer";
}

export function orderBackHash(options = {}) {
  const ctx = { ...readOrderBackContext(), ...options };
  const actor = orderBackActor(ctx);
  if (actor === "admin") return "#admin";
  if (actor === "partner") {
    return partnerDeskHash(partnerAppKind(ctx.partner), ctx.partner);
  }
  return "#myorders";
}

export function orderBackLabel(actor, { customer = "Back to Orders" } = {}) {
  if (actor === "admin" || actor === "staff") return "Back to order";
  if (actor === "partner") return "Back to orders";
  return customer;
}

function isCustomerHomeHash(hash) {
  if (!hash) return false;
  const { route } = parseAppHash(hash);
  return route === "#home";
}

function scrollStaffOrders() {
  if (typeof document === "undefined") return;
  const jump = () => {
    document.getElementById(STAFF_ORDERS_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  jump();
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(jump);
  if (typeof setTimeout === "function") setTimeout(jump, 80);
}

export function goToOrderListHash(options) {
  const hash = orderBackHash(options);
  goToHash(hash);
  if (hash === "#admin") scrollStaffOrders();
  return hash;
}

export function parentHashFor(rawHash, options) {
  const ctx = options === undefined ? readOrderBackContext() : { actor: "", ...options };
  const actor = orderBackActor({ ...ctx, fromHash: ctx.fromHash || rawHash });
  const { route, service, lab, id, plan, q, from } = parseAppHash(rawHash);

  if (route === "#admin") {
    return id ? ADMIN_HOME_HASH : "";
  }

  if (route === "#track" || route === "#scan") {
    if (from === "admin" || from === "staff") return ADMIN_HOME_HASH;
    return orderBackHash({ ...ctx, actor, fromHash: rawHash });
  }

  if (isPartnerDeskRoute(route)) {
    return actor === "admin" ? "#admin" : id ? route : "";
  }

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
    if (actor === "admin") return "#admin";
    if (actor === "partner") return orderBackHash({ ...ctx, actor });
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
  if (typeof window === "undefined") return;
  const current = window.location.hash || "#home";
  const ctx = readOrderBackContext();
  const actor = orderBackActor({ ...ctx, fromHash: current });

  if (actor !== "customer") {
    let dest = parentHashFor(current, { ...ctx, actor });
    if (!dest || isCustomerHomeHash(dest)) {
      dest = orderBackHash({ ...ctx, actor });
    }
    if (!dest || hashesMatch(current, dest)) {
      if (dest === "#admin" || parseAppHash(current).route === "#admin") {
        scrollStaffOrders();
      }
      return;
    }
    goToHash(dest);
    if (dest === "#admin") scrollStaffOrders();
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  goToHash(parentHashFor(current, { ...ctx, actor }) || "#home");
}
