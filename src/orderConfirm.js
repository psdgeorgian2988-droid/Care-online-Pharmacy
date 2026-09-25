/** Kinds that stay as a customer request until a partner confirms. */
export const PARTNER_CONFIRM_KINDS = new Set([
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
  "doctor",
  "stepdown",
  "ambulance",
]);

export function needsPartnerConfirm(kind) {
  return PARTNER_CONFIRM_KINDS.has(String(kind || "").toLowerCase());
}

/** True until a partner (or medicine auto path) has actually confirmed. */
export function isAwaitingPartnerConfirm(order) {
  const kind = String(order?.kind || order?.orderType || "").toLowerCase();
  if (!needsPartnerConfirm(kind)) return false;
  if (order?.cancelled === true || String(order?.status || "").toLowerCase() === "cancelled") {
    return false;
  }
  if (order?.partnerConfirmed === true) return false;
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  if (confirm === "accepted" || confirm === "auto") return false;
  if (confirm === "slot_offered") return false;
  if (confirm === "declined") return false;
  return true;
}

export const SLOT_CONFIRM_KINDS = new Set(["radiology", "psychologist", "doctor"]);

export function needsSlotConfirm(kind) {
  return SLOT_CONFIRM_KINDS.has(String(kind || "").toLowerCase());
}

export function slotPartnerNoun(kind) {
  const key = String(kind || "").toLowerCase();
  if (key === "psychologist") return "psychologist";
  if (key === "doctor") return "doctor";
  return "imaging centre";
}

export function isAwaitingCustomerSlotConfirm(order) {
  const slot = String(order?.slotConfirmStatus || "").toLowerCase();
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  const status = String(order?.trackStatus || "").toLowerCase();
  return slot === "offered" || confirm === "slot_offered" || status === "slot_offered";
}

export function initialOrderStatus(kind) {
  if (String(kind || "").toLowerCase() === "stepdown") {
    return {
      trackStatus: "requested",
      status: "New Booking",
      partnerConfirmed: false,
      partnerConfirmStatus: "pending",
    };
  }
  if (needsPartnerConfirm(kind)) {
    return {
      trackStatus: "requested",
      status: "Awaiting Partner Confirmation",
      partnerConfirmed: false,
      partnerConfirmStatus: "pending",
    };
  }
  return {
    trackStatus: "confirmed",
    status: "Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "auto",
  };
}

/**
 * Confirm medicine orders only when every cart line is still available
 * in the live catalogue (not hidden / removed).
 */
export function checkMedicineAvailability(cart, catalogue = []) {
  const items = Array.isArray(cart) ? cart : [];
  if (!items.length) {
    return { ok: false, missing: [], message: "Your cart is empty." };
  }
  const byId = new Map(
    (catalogue || [])
      .filter((row) => row && row.id != null)
      .map((row) => [String(row.id), row])
  );
  const missing = [];
  for (const item of items) {
    const id = String(item?.id ?? "");
    const name = String(item?.name || "Medicine").trim();
    const qty = Math.max(1, Number(item?.quantity || item?.qty || 1));
    const row = byId.get(id);
    if (!row) {
      missing.push({ id, name, quantity: qty, reason: "not_in_catalogue" });
      continue;
    }
    if (row.available === false || row.inStock === false) {
      missing.push({ id, name, quantity: qty, reason: "out_of_stock" });
      continue;
    }
    const stock = Number(row.stockQty ?? row.qty ?? row.availableQty);
    if (Number.isFinite(stock) && stock < qty) {
      missing.push({ id, name, quantity: qty, reason: "insufficient_stock", stock });
    }
  }
  if (missing.length) {
    const names = missing.map((row) => row.name).join(", ");
    return {
      ok: false,
      missing,
      message: `Not available right now: ${names}. Remove these items or try again later.`,
    };
  }
  return {
    ok: true,
    missing: [],
    message: "All medicines are available. Order confirmed.",
    checkedAt: Date.now(),
  };
}

export function medicineConfirmedFields(availability) {
  return {
    trackStatus: "confirmed",
    status: "Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "auto",
    availabilityChecked: true,
    availabilityCheckedAt: availability?.checkedAt || Date.now(),
    availabilityMessage: availability?.message || "Confirmed after availability check.",
  };
}

export function medicineAwaitingPharmacyFields(extras = {}) {
  return {
    trackStatus: "requested",
    status: "Order placed",
    partnerConfirmed: false,
    partnerConfirmStatus: "pending",
    availabilityChecked: Boolean(extras.availabilityChecked),
    availabilityCheckedAt: extras.availabilityCheckedAt || Date.now(),
    availabilityMessage:
      extras.availabilityMessage ||
      "Sent to the PIN pharmacy. Confirmed after they review the prescription.",
  };
}

export function diagnosticRequestFields(kind, extras = {}) {
  const requestedTimeSlot = String(
    extras.timeSlot || extras.requestedTimeSlot || ""
  ).trim();
  const requestedDate = String(extras.date || extras.requestedDate || "").trim();
  const needsSlot = needsSlotConfirm(kind);
  return {
    ...initialOrderStatus(kind),
    partnerAssignedAt: 0,
    ...(requestedTimeSlot
      ? { requestedTimeSlot, timeSlot: requestedTimeSlot }
      : {}),
    ...(requestedDate ? { requestedDate, date: requestedDate } : {}),
    slotConfirmed: false,
    slotConfirmStatus: needsSlot ? "pending" : "auto",
  };
}

export function firstAcceptRequestFields(kind) {
  return {
    ...initialOrderStatus(kind),
    partnerId: "",
    partnerName: "",
    partnerMobile: "",
    partnerAssignedAt: 0,
    offerMode: "first_accept",
    declinedBy: [],
  };
}

export function partnerAcceptFields(now = Date.now(), kind = "") {
  if (String(kind || "").toLowerCase() === "medicine") {
    return {
      trackStatus: "confirmed",
      status: "Approved by pharmacist",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
      partnerConfirmedAt: now,
    };
  }
  if (String(kind || "").toLowerCase() === "stepdown") {
    return {
      trackStatus: "confirmed",
      status: "Booking Accepted",
      partnerConfirmed: true,
      partnerConfirmStatus: "accepted",
      partnerConfirmedAt: now,
    };
  }
  return {
    trackStatus: "confirmed",
    status: "Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
  };
}

export function partnerApproveFields(kind, extras = {}, now = Date.now()) {
  if (typeof extras === "number") {
    now = extras;
    extras = {};
  }
  const key = String(kind || "").toLowerCase();
  const assignNow = key === "lab" || key === "radiology" || key === "homecare";
  return {
    trackStatus: assignNow ? "assigned" : "confirmed",
    status: assignNow ? "Partner Assigned" : "Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
    ...extras,
  };
}

export function acceptRequestedSlotFields(kind, order = {}, now = Date.now()) {
  const key = String(kind || order?.kind || order?.orderType || "").toLowerCase();
  const date = String(order.requestedDate || order.date || "").trim();
  const timeSlot = String(order.requestedTimeSlot || order.timeSlot || "").trim();
  return {
    trackStatus: "assigned",
    status:
      key === "psychologist"
        ? "Psychologist Confirmed"
        : "Imaging Centre Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
    date,
    timeSlot,
    requestedDate: date,
    requestedTimeSlot: timeSlot,
    slotConfirmed: true,
    slotConfirmStatus: "accepted",
    slotConfirmedAt: now,
  };
}

export function radiologyAcceptRequestedSlotFields(order = {}, now = Date.now()) {
  return acceptRequestedSlotFields("radiology", order, now);
}

export function partnerOfferSlotFields(offer = {}, now = Date.now()) {
  const date = String(offer.date || offer.offeredDate || "").trim();
  const timeSlot = String(offer.timeSlot || offer.offeredTimeSlot || "").trim();
  return {
    trackStatus: "slot_offered",
    status: "Awaiting Customer Slot Confirmation",
    partnerConfirmed: false,
    partnerConfirmStatus: "slot_offered",
    partnerConfirmedAt: 0,
    date,
    timeSlot,
    offeredDate: date,
    offeredTimeSlot: timeSlot,
    requestedDate: String(offer.requestedDate || "").trim(),
    requestedTimeSlot: String(offer.requestedTimeSlot || "").trim(),
    slotConfirmed: false,
    slotConfirmStatus: "offered",
    slotOfferedAt: now,
  };
}

export function customerAcceptSlotFields(order = {}, now = Date.now()) {
  const kind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
  const date = String(order.offeredDate || order.date || "").trim();
  const timeSlot = String(order.offeredTimeSlot || order.timeSlot || "").trim();
  return {
    trackStatus: "assigned",
    status:
      kind === "psychologist"
        ? "Psychologist Confirmed"
        : "Imaging Centre Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
    date,
    timeSlot,
    slotConfirmed: true,
    slotConfirmStatus: "accepted",
    slotConfirmedAt: now,
  };
}

export function customerDeclineOfferedSlotFields(order = {}, now = Date.now()) {
  return {
    trackStatus: "requested",
    status: "Customer Declined Offered Slot",
    partnerConfirmed: false,
    partnerConfirmStatus: "slot_rejected",
    date: String(order.requestedDate || order.date || "").trim(),
    timeSlot: String(order.requestedTimeSlot || order.timeSlot || "").trim(),
    slotConfirmed: false,
    slotConfirmStatus: "rejected",
    slotRejectedAt: now,
  };
}

export function appointmentSlotLabel(order) {
  const slot = String(order?.timeSlot || order?.offeredTimeSlot || order?.requestedTimeSlot || "").trim();
  if (!slot) return "Not provided";
  const kind = String(order?.kind || order?.orderType || order?.serviceType || "").toLowerCase();
  if (isAwaitingCustomerSlotConfirm(order)) {
    return `${slot} (offered by ${slotPartnerNoun(kind)} — accept to confirm)`;
  }
  if (order?.slotConfirmed) return `${slot} (confirmed)`;
  if (needsSlotConfirm(kind)) {
    return `${slot} (requested — awaiting ${slotPartnerNoun(kind)})`;
  }
  return slot;
}

export function partnerDeclineFields(now = Date.now(), kind = "") {
  const stepdown = String(kind || "").toLowerCase() === "stepdown";
  return {
    trackStatus: "declined",
    status: stepdown ? "Not Available" : "Declined By Partner",
    partnerConfirmed: false,
    partnerConfirmStatus: "declined",
    partnerConfirmedAt: now,
    trackCompleted: true,
  };
}

export function awaitingPartnerMessage(kind) {
  const key = String(kind || "").toLowerCase();
  if (key === "lab") {
    return "Your laboratory test request has been sent. It is confirmed only after the lab partner accepts it.";
  }
  if (key === "radiology") {
    return "Your radiology request has been sent. If your preferred slot is free, the imaging centre can confirm it. If not, they will offer another slot — the booking is confirmed only after you accept that slot.";
  }
  if (key === "psychologist") {
    return "Your psychologist request has been sent. If your preferred slot is free, the psychologist can confirm it. If not, they will offer another available slot — the booking is confirmed only after you accept that slot.";
  }
  if (key === "doctor") {
    return "Your doctor appointment request has been sent. If your preferred slot is free, the doctor can confirm it. If not, they will offer another available slot — the booking is confirmed only after you accept that slot.";
  }
  if (key === "homecare") {
    return "Your home-care request was sent to all available nurses, caregivers, and physiotherapists in your PIN. The first partner who accepts is assigned, and their details appear here.";
  }
  if (key === "ambulance") {
    return "Your ambulance request has been sent. It is confirmed only after the ambulance partner accepts it.";
  }
  if (key === "stepdown") {
    return "Your step-down booking request has been sent. It is confirmed only after the centre taps Confirm. If they tap Not Available, the booking is declined.";
  }
  return "Your booking request has been sent. It is confirmed only after the service partner accepts it.";
}
