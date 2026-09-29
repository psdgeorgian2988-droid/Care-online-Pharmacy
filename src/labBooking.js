import { emptyAddress, pickAddress } from "./addressFields.js";
import { initialBookingFor } from "./bookingFor.js";
import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners.js";
import { labBookingHash, parseAppHash } from "./hashRoute.js";

export const EMPTY_DIAGNOSTIC_FORM = {
  patientName: "",
  mobile: "",
  ...emptyAddress(),
  visitType: "home",
  date: "",
  timeSlot: "",
};

export function diagnosticBookingKind(service) {
  return String(service || "").toLowerCase() === "radiology" ? "radiology" : "lab";
}

export function knownDiagnosticPartnerId(serviceType, labId) {
  const id = String(labId || "").trim();
  if (!id) return "";
  const kind = diagnosticBookingKind(serviceType);
  const list = kind === "radiology" ? IMAGING_CENTRES : DIAGNOSTIC_LABS;
  return list.some((row) => row.id === id) ? id : "";
}

export function diagnosticBookingFromHash(rawHash) {
  const { service, lab } = parseAppHash(rawHash || "");
  const serviceType = diagnosticBookingKind(service);
  const labId = knownDiagnosticPartnerId(serviceType, lab);
  return {
    serviceType,
    labId,
    hash: labId ? labBookingHash(labId, serviceType) : "#labs",
  };
}

export function savedDiagnosticPartnerId(saved) {
  return String(
    saved?.preferredLabId || saved?.preferredPartnerId || saved?.partnerId || ""
  ).trim();
}

/**
 * Opening a Labs-hub partner card must show that brand’s tests, not a leftover
 * confirmation. Restore only when the customer did not pick a catalog partner.
 */
export function shouldOpenSavedDiagnosticBooking(saved, requested = {}) {
  if (!saved || typeof saved !== "object") return false;
  const id = String(saved.bookingId || saved.id || "").trim();
  if (!id) return false;
  if (saved.paid || saved.paymentStatus === "paid") return false;
  if (String(saved.partnerConfirmStatus || "").toLowerCase() === "declined") {
    return false;
  }
  const requestedId = String(requested.labId || requested.partnerId || "").trim();
  if (requestedId) return false;
  return true;
}

export function blankDiagnosticBookingForm(profile = null, registeredProfile = null) {
  return {
    ...EMPTY_DIAGNOSTIC_FORM,
    ...emptyAddress(),
    ...initialBookingFor(profile || {}),
    ...(registeredProfile
      ? {
          patientName: registeredProfile.name || "",
          mobile: registeredProfile.mobile || "",
          ...pickAddress(registeredProfile),
        }
      : {}),
    date: "",
    timeSlot: "",
    visitType: "home",
  };
}

export function diagnosticBrandLabel(order) {
  return String(
    order?.preferredLab ||
      order?.preferredPartner ||
      order?.partner ||
      "Partner"
  ).trim() || "Partner";
}
