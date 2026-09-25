import { appointmentSlotStartMs } from "./appointmentSlot.js";
import { orderPayableRupees } from "./partnerCollect.js";
import { formatInr } from "./salesReport.js";

export const STEPDOWN_CANCEL_LEAD_HOURS = 4;
export const STEPDOWN_LATE_REMIT_PERCENT = 50;
export const STEPDOWN_CHECK_IN_TIME = "2:00 PM";

export const STEPDOWN_CANCEL_POLICY =
  "Cancel the booking at least 4 hours prior to 2:00 PM check-in. Later than that, 50% of the advance will be remitted.";

export function isStepdownCancelled(order) {
  if (order?.cancelled === true) return true;
  const status = String(order?.status || "").toLowerCase();
  const track = String(order?.trackStatus || "").toLowerCase();
  return status === "cancelled" || track === "cancelled";
}

export function stepdownCheckInMs(order) {
  return appointmentSlotStartMs(
    order?.date || order?.appointmentDate,
    order?.timeSlot || STEPDOWN_CHECK_IN_TIME
  );
}

export function stepdownAdvanceRupees(order) {
  const paid =
    order?.paid === true || String(order?.paymentStatus || "").toLowerCase() === "paid";
  if (!paid) return 0;
  const named = Number(order?.advanceRupees || order?.amountRupees || orderPayableRupees(order) || 0);
  return Number.isFinite(named) && named > 0 ? Math.round(named) : 0;
}

export function stepdownCancelQuote(order, now = Date.now()) {
  if (isStepdownCancelled(order)) {
    const advance = Number(order?.advanceRupees || stepdownAdvanceRupees(order) || 0);
    const remitPercent = Number(order?.remitPercent);
    const remitRupees = Number(order?.remitRupees ?? order?.refundAmount ?? 0);
    return {
      cancelled: true,
      canCancel: false,
      late: Boolean(order?.cancelLate),
      afterCheckIn: false,
      hoursPrior: null,
      advanceRupees: advance,
      remitPercent: Number.isFinite(remitPercent) ? remitPercent : 0,
      remitRupees: Number.isFinite(remitRupees) ? remitRupees : 0,
      policyText: STEPDOWN_CANCEL_POLICY,
      detailText: remittanceLine(advance, remitPercent, remitRupees),
      confirmText: "",
    };
  }

  const checkIn = stepdownCheckInMs(order);
  const hoursPrior = checkIn == null ? null : (checkIn - Number(now)) / (60 * 60 * 1000);
  const afterCheckIn = hoursPrior != null && hoursPrior <= 0;
  const late = hoursPrior != null && hoursPrior < STEPDOWN_CANCEL_LEAD_HOURS && hoursPrior > 0;
  const canCancel = !afterCheckIn;
  const remitPercent = late ? STEPDOWN_LATE_REMIT_PERCENT : 100;
  const advanceRupees = stepdownAdvanceRupees(order);
  const remitRupees = Math.round((advanceRupees * remitPercent) / 100);

  return {
    cancelled: false,
    canCancel,
    late,
    afterCheckIn,
    hoursPrior,
    advanceRupees,
    remitPercent: canCancel ? remitPercent : 0,
    remitRupees: canCancel ? remitRupees : 0,
    policyText: STEPDOWN_CANCEL_POLICY,
    detailText: afterCheckIn
      ? "Check-in has started. This booking cannot be cancelled."
      : cancelDetail(late, advanceRupees, remitPercent, remitRupees),
    confirmText: canCancel
      ? `${cancelDetail(late, advanceRupees, remitPercent, remitRupees)} Cancel this booking?`
      : "",
  };
}

export function stepdownCancelFields(order, now = Date.now()) {
  const quote = stepdownCancelQuote(order, now);
  if (!quote.canCancel) return null;
  const note = quote.late
    ? "Cancelled less than 4 hours before check-in. 50% of the advance remitted."
    : "Cancelled at least 4 hours before check-in. Full advance remitted.";
  return {
    cancelled: true,
    cancelledAt: now,
    cancelLate: quote.late,
    advanceRupees: quote.advanceRupees,
    remitPercent: quote.remitPercent,
    remitRupees: quote.remitRupees,
    status: "Cancelled",
    trackStatus: "cancelled",
    trackCompleted: true,
    refundNote: note,
    ...(quote.remitRupees > 0
      ? {
          refundStatus: "pending",
          refundAmount: quote.remitRupees,
          refundUpdatedAt: now,
        }
      : {}),
  };
}

function cancelDetail(late, advanceRupees, remitPercent, remitRupees) {
  if (advanceRupees <= 0) {
    return late
      ? "Less than 4 hours remain before check-in. No advance has been paid, so nothing will be remitted."
      : "No advance has been paid. The booking will be cancelled with nothing to remit.";
  }
  if (late) {
    return `Less than 4 hours remain before check-in. ${remitPercent}% of the advance (${formatInr(remitRupees)}) will be remitted.`;
  }
  return `At least 4 hours remain before check-in. The full advance (${formatInr(advanceRupees)}) will be remitted.`;
}

function remittanceLine(advance, percent, remitted) {
  if (remitted > 0) {
    return `${Number.isFinite(percent) ? `${percent}% of ` : ""}the advance (${formatInr(remitted)}) will be remitted.`;
  }
  if (advance > 0) {
    return "No remittance is due on this cancellation.";
  }
  return "No advance was paid, so nothing was remitted.";
}
