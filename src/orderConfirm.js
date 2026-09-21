/** Kinds that stay as a customer request until a partner confirms. */
export const PARTNER_CONFIRM_KINDS = new Set([
  "lab",
  "radiology",
  "homecare",
  "vaccination",
  "psychologist",
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
  if (order?.partnerConfirmed === true) return false;
  const confirm = String(order?.partnerConfirmStatus || "").toLowerCase();
  if (confirm === "accepted" || confirm === "auto") return false;
  if (confirm === "declined") return false;
  return true;
}

export function initialOrderStatus(kind) {
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

export function partnerAcceptFields(now = Date.now()) {
  return {
    trackStatus: "confirmed",
    status: "Confirmed",
    partnerConfirmed: true,
    partnerConfirmStatus: "accepted",
    partnerConfirmedAt: now,
  };
}

export function partnerDeclineFields(now = Date.now()) {
  return {
    trackStatus: "declined",
    status: "Declined By Partner",
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
    return "Your radiology request has been sent. It is confirmed only after the imaging partner accepts it.";
  }
  if (key === "ambulance") {
    return "Your ambulance request has been sent. It is confirmed only after the ambulance partner accepts it.";
  }
  return "Your booking request has been sent. It is confirmed only after the service partner accepts it.";
}
