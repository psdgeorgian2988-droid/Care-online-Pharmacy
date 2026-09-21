import { persistOrder, withTracking } from "./orderTracking";
import { partnerAcceptFields } from "./orderConfirm";
import { pickAddress, readUserProfile } from "./addressFields";
import { isoDateToday } from "./personFields";
import { LAB_TIME_SLOTS, openAppointmentSlots } from "./appointmentSlot";
import { DIAGNOSTIC_LABS, IMAGING_CENTRES, findDiagnosticParty } from "./diagnosticPartners";

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return norm(value).split(" ").filter((part) => part.length > 1);
}

function tokenClose(part, row) {
  if (!part || !row) return false;
  if (row === part) return true;
  if (row.includes(part) && part.length >= 3) return true;
  if (part.includes(row) && row.length >= 4) return true;
  return false;
}

function scoreNames(query, name) {
  const q = norm(query);
  const n = norm(name);
  if (!q || !n) return 0;
  if (q === n) return 100;
  if (q.length >= 4 && (n.includes(q) || (n.length >= 4 && q.includes(n)))) return 86;
  const qParts = tokens(query);
  const nParts = tokens(name);
  if (!qParts.length || !nParts.length) return 0;
  let hits = 0;
  for (const part of qParts) {
    if (nParts.some((row) => tokenClose(part, row))) {
      hits += 1;
    }
  }
  const distinctive = qParts.filter((part) => part.length >= 4);
  const distinctiveHits = distinctive.filter(
    (part) => n.includes(part) || nParts.some((row) => tokenClose(part, row))
  ).length;
  const base = Math.round((hits / qParts.length) * 70);
  if (distinctive.length && distinctiveHits === distinctive.length) {
    return Math.max(80, base);
  }
  if (distinctiveHits) return Math.min(95, base + 18);
  return base;
}

export function splitRxTestNames(name) {
  return String(name || "")
    .split(/\s*(?:\/|&|,|;|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function labsForKind(kind) {
  return kind === "radiology" ? IMAGING_CENTRES : DIAGNOSTIC_LABS;
}

export function matchPrescriptionTest(rxTest) {
  const query = String(rxTest?.name || "").trim();
  if (!query) return { rx: rxTest, kind: "lab", matches: [] };

  const collect = (kind) => {
    const rows = [];
    for (const partner of labsForKind(kind)) {
      for (const test of partner.tests || []) {
        const score = Math.max(
          scoreNames(query, test.name),
          scoreNames(query, test.id)
        );
        if (score < 60) continue;
        rows.push({
          score,
          kind,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerArea: partner.area || "",
          testId: test.id,
          testName: test.name,
          price: Number(test.price || 0),
          code: test.code || test.id,
        });
      }
    }
    rows.sort((a, b) => b.score - a.score || a.price - b.price);
    const seen = new Set();
    const unique = [];
    for (const row of rows) {
      if (seen.has(row.partnerId)) continue;
      seen.add(row.partnerId);
      unique.push(row);
      if (unique.length >= 8) break;
    }
    return unique;
  };

  const labMatches = collect("lab");
  const radMatches = collect("radiology");
  const kind =
    (radMatches[0]?.score || 0) > (labMatches[0]?.score || 0) ? "radiology" : "lab";
  const matches = kind === "radiology" ? radMatches : labMatches;
  return { rx: rxTest, kind, matches };
}

export function cheapestMatch(matches = []) {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => a.price - b.price)[0];
}

export function packCount(packSize) {
  return parseInt(String(packSize || "").match(/\d+/)?.[0] || "10", 10) || 10;
}

export function suggestedPacks(rxMed, packSize) {
  const days = parseInt(String(rxMed?.durationDays || rxMed?.duration || ""), 10) || 0;
  const times = parseInt(String(rxMed?.timesPerDay || rxMed?.frequency || ""), 10) || 0;
  const pack = packCount(packSize);
  if (!days || !times) return 1;
  return Math.max(1, Math.ceil((days * times) / pack));
}

export function checkoutPayloadForTests({ kind = "lab", partnerId, tests = [] } = {}) {
  const serviceType = kind === "radiology" ? "radiology" : "lab";
  const partner = findDiagnosticParty(serviceType, { id: partnerId });
  const mapped = tests.map((row) => ({
    id: row.testId || row.id,
    name: row.testName || row.name,
    price: Number(row.price || 0),
    code: row.code || row.testId || row.id,
  }));
  const payload = {
    partnerId,
    serviceType,
    tests: mapped,
  };
  const profile = readUserProfile();
  const addr = pickAddress(profile || {});
  const date = isoDateToday();
  const timeSlot = openAppointmentSlots(LAB_TIME_SLOTS, date)[0] || "";
  const pin = String(addr.pinCode || profile?.pinCode || "").replace(/\D/g, "");
  const mobile = String(profile?.mobile || "").replace(/\D/g, "").slice(-10);
  const name = String(profile?.name || "").trim();
  if (!partner || !name || mobile.length < 10 || pin.length !== 6 || !timeSlot) {
    return payload;
  }
  const total = mapped.reduce((sum, row) => sum + row.price, 0);
  const bookingDetails = {
    bookingId:
      (serviceType === "lab" ? "MH-LAB-" : "MH-RAD-") +
      Math.floor(100000 + Math.random() * 900000),
    serviceType,
    kind: serviceType,
    preferredPartner: partner.name,
    preferredPartnerId: partner.id,
    partner: partner.name,
    partnerId: partner.id,
    partnerGstin: partner.gstin,
    partnerDlNo: partner.dlNo,
    partnerArea: partner.area,
    partnerAddress: partner.address,
    tests: mapped,
    total,
    patientName: name,
    mobile,
    ...addr,
    pinCode: pin,
    visitType: serviceType === "radiology" ? "centre" : "home",
    date,
    timeSlot,
    bookedAt: new Date().toLocaleString(),
    bookedAtMs: Date.now(),
    ...partnerAcceptFields(),
    trackStatus: serviceType === "lab" ? "assigned" : "confirmed",
    status:
      serviceType === "lab"
        ? "Partner assigned — sample collection"
        : "Partner confirmed — visit scheduled",
    paymentMethod: "pending",
    paymentStatus: "awaiting_payment",
    paid: false,
  };
  payload.booking = persistOrder(withTracking(bookingDetails, serviceType));
  return payload;
}
