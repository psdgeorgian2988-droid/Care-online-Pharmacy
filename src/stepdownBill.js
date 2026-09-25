export const STEPDOWN_DAY_RATE = 4999;

export const STEPDOWN_CHARGE_OPTIONS = [
  { id: "room-rent", label: "Room rent" },
  { id: "bed-charge", label: "Bed charge" },
  { id: "admission", label: "Admission / registration" },
  { id: "medicine", label: "Medicine" },
  { id: "doctor-visit", label: "Doctor visit" },
  { id: "specialist", label: "Specialist consultation" },
  { id: "nursing", label: "Nursing care" },
  { id: "consumables", label: "Consumables" },
  { id: "dressing", label: "Dressing" },
  { id: "injection", label: "Injection / IV fluids" },
  { id: "procedure", label: "Procedure / wound care" },
  { id: "physio", label: "Physiotherapy" },
  { id: "oxygen", label: "Oxygen charges" },
  { id: "equipment", label: "Equipment / monitor hire" },
  { id: "diagnostics", label: "Diagnostics / lab" },
  { id: "radiology", label: "Radiology / imaging" },
  { id: "diet", label: "Diet / meal" },
  { id: "attendant", label: "Attendant charges" },
  { id: "ambulance", label: "Ambulance" },
  { id: "other", label: "Other" },
];

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function stepdownBookedDays(order) {
  const days = Number(order?.durationDays);
  return Number.isFinite(days) && days > 0 ? Math.round(days) : 1;
}

export function stepdownDayRate(order) {
  const rate = Number(order?.dayRate || order?.stepdownDayRate);
  return Number.isFinite(rate) && rate > 0 ? money(rate) : STEPDOWN_DAY_RATE;
}

export function stepdownRoomRentTotal(order) {
  return money(stepdownBookedDays(order) * stepdownDayRate(order));
}

export function isStepdownRoomRentPaid(order = {}) {
  return (
    order?.roomRentPaid === true ||
    Number(order?.roomRentPaidRupees) > 0
  );
}

export function stepdownBalanceDue(order = {}) {
  const credit = isStepdownRoomRentPaid(order) ? stepdownRoomRentTotal(order) : 0;
  return money(Math.max(0, stepdownBillTotal(order) - credit));
}

export function stepdownExtendedRows(order) {
  const rows = Array.isArray(order?.extendedDays) ? order.extendedDays : [];
  const rate = stepdownDayRate(order);
  return rows
    .map((row, index) => ({
      date: String(row?.date || "").slice(0, 10),
      rate: money(row?.rate || rate),
      amount: money(row?.amount || row?.rate || rate),
      dayNo: index + 1,
    }))
    .filter((row) => row.amount > 0 || row.date);
}

export function addIsoDays(iso, days) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(days || 0));
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function stepdownStayStartIso(order) {
  return String(order?.date || order?.appointmentDate || "").slice(0, 10);
}

export function nextStepdownExtensionDate(order) {
  const start = stepdownStayStartIso(order);
  if (!start) return "";
  return addIsoDays(start, stepdownBookedDays(order) + stepdownExtendedRows(order).length);
}

function isoToday() {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function stepdownLineHeading(row) {
  if (row?.service === "other") {
    return String(row.note || "").trim() || "Other";
  }
  const option = STEPDOWN_CHARGE_OPTIONS.find((item) => item.id === row?.service);
  return option?.label || "Charge";
}

function dateRangeLabel(from, to) {
  if (from && to && from !== to) return `${from} to ${to}`;
  return from || to || "";
}

export function stepdownBillLines(order) {
  const booked = stepdownBookedDays(order);
  const rate = stepdownDayRate(order);
  const start = stepdownStayStartIso(order);
  const end = start && booked > 0 ? addIsoDays(start, booked - 1) : "";
  const lines = [];
  if (booked > 0) {
    lines.push({
      sno: 1,
      name: "Room rent",
      detail: dateRangeLabel(start, end) || "Initial stay",
      qty: booked,
      rate,
      amount: money(booked * rate),
      hideQty: true,
      kind: "booked",
      service: "room-rent",
    });
  }
  let extraDay = booked;
  const leftover = stepdownExtendedRows(order);
  if (leftover.length) {
    const from = leftover[0].date || (start ? addIsoDays(start, extraDay) : "");
    extraDay += leftover.length;
    const to =
      leftover[leftover.length - 1].date || (start ? addIsoDays(start, extraDay - 1) : "");
    const amount = leftover.reduce((sum, row) => sum + row.amount, 0);
    lines.push({
      sno: lines.length + 1,
      name: "Room rent",
      detail: dateRangeLabel(from, to) || "Extended stay",
      qty: leftover.length,
      rate: leftover[0].rate,
      amount,
      hideQty: true,
      kind: "extended",
      service: "room-rent",
    });
  }
  stepdownChargeRows(order).forEach((row) => {
    const heading = stepdownLineHeading(row);
    if (stepdownChargeUsesDays(row.service)) {
      const days = Math.max(1, row.qty);
      const from = start ? addIsoDays(start, extraDay) : row.date;
      extraDay += days;
      const to = start ? addIsoDays(start, extraDay - 1) : row.date;
      lines.push({
        sno: lines.length + 1,
        name: heading,
        detail: dateRangeLabel(from, to) || "Extended stay",
        qty: days,
        rate: row.rate,
        amount: row.amount,
        hideQty: true,
        kind: "charge-day",
        service: row.service,
      });
      return;
    }
    const date = row.date || "";
    const isMedicine = row.service === "medicine";
    lines.push({
      sno: lines.length + 1,
      name: heading,
      detail: date || (isMedicine ? "Medicine bill" : ""),
      qty: row.qty,
      rate: row.rate,
      amount: row.amount,
      hideQty: true,
      kind: "charge",
      service: row.service,
      billFileName: row.billFileName,
      billFileData: row.billFileData,
      billFileType: row.billFileType,
    });
  });
  return lines;
}

export function stepdownBillTotal(order) {
  return money(stepdownBillLines(order).reduce((sum, line) => sum + line.amount, 0));
}

export function finalizeStepdownBill(order = {}, extras = {}, now = Date.now()) {
  const total = stepdownBillTotal(order);
  const method = String(extras.paymentMethod || "").toLowerCase();
  const paid = extras.paid === true;
  return {
    billFinalized: true,
    billFinalizedAt: now,
    headingTotals: stepdownHeadingTotals(order),
    billLines: stepdownBillLines(order),
    total,
    saleRupees: total,
    paid,
    paymentStatus: paid ? "paid" : "pending",
    paymentMethod: method,
    paidOn: paid ? String(extras.paidOn || "partner") : "",
    paidAt: paid ? now : 0,
  };
}

export function stepdownHeadingTotals(order) {
  const groups = new Map();
  const add = (id, label, amount) => {
    const current = groups.get(id) || { id, label, amount: 0 };
    current.amount = money(current.amount + Number(amount || 0));
    groups.set(id, current);
  };
  const booked = stepdownBookedDays(order);
  if (booked > 0) {
    add("room-rent", "Room rent", booked * stepdownDayRate(order));
  }
  const leftover = stepdownExtendedRows(order);
  if (leftover.length) {
    add(
      "room-rent",
      "Room rent",
      leftover.reduce((sum, row) => sum + row.amount, 0)
    );
  }
  stepdownChargeRows(order).forEach((row) => {
    const option = STEPDOWN_CHARGE_OPTIONS.find((item) => item.id === row.service);
    const id = stepdownChargeUsesDays(row.service) ? "room-rent" : row.service;
    const label =
      id === "room-rent"
        ? "Room rent"
        : row.service === "other"
          ? row.note || option?.label || "Other"
          : option?.label || row.label;
    add(id === "other" && row.note ? `other:${row.note}` : id, label, row.amount);
  });
  return [...groups.values()].filter((row) => row.amount > 0);
}

export function startStepdownBill(order, extras = {}) {
  const next = {
    ...order,
    dayRate: stepdownDayRate(order),
    extendedDays: Array.isArray(order?.extendedDays) ? order.extendedDays : [],
    billingStarted: true,
    billingStartedAt: extras.now || Date.now(),
  };
  const total = stepdownBillTotal(next);
  return {
    dayRate: next.dayRate,
    extendedDays: next.extendedDays,
    extendedDayCount: next.extendedDays.length,
    stayCharges: stepdownChargeRows(next),
    billingStarted: true,
    billingStartedAt: next.billingStartedAt,
    total,
    saleRupees: total,
  };
}

export function addStepdownExtendedDays(order, count = 1) {
  const n = Math.max(1, Math.min(30, Math.round(Number(count) || 1)));
  const rate = stepdownDayRate(order);
  const existing = stepdownExtendedRows(order);
  const start = nextStepdownExtensionDate(order);
  const added = [];
  for (let i = 0; i < n; i += 1) {
    added.push({
      date: start ? addIsoDays(start, i) : "",
      rate,
      amount: rate,
    });
  }
  const extendedDays = [...existing, ...added];
  const next = { ...order, dayRate: rate, extendedDays };
  const total = stepdownBillTotal(next);
  return {
    dayRate: rate,
    extendedDays,
    extendedDayCount: extendedDays.length,
    stayCharges: stepdownChargeRows(next),
    billingStarted: true,
    total,
    saleRupees: total,
  };
}

export function stepdownChargeUsesDays(service) {
  return service === "room-rent" || service === "bed-charge";
}

export function stepdownChargeLabel(service, note = "", qty = 1) {
  const option = STEPDOWN_CHARGE_OPTIONS.find((row) => row.id === service);
  if (service === "other") {
    return String(note || "").trim() || option?.label || "Other";
  }
  const label = option?.label || String(service || "Charge").trim();
  if (stepdownChargeUsesDays(service)) {
    const days = Math.max(1, Math.round(Number(qty) || 1));
    return `${label} (${days} day${days === 1 ? "" : "s"})`;
  }
  return label;
}

export function stepdownChargeRows(order) {
  const rows = Array.isArray(order?.stayCharges) ? order.stayCharges : [];
  return rows
    .map((row, index) => {
      const qty = Math.max(1, Math.round(Number(row?.qty || 1)));
      const rate = money(row?.rate ?? row?.amount ?? 0);
      const amount = money(row?.amount ?? rate * qty);
      const service = String(row?.service || "other");
      const note = String(row?.note || "").trim();
      return {
        id: String(row?.id || `SDC-${index + 1}`),
        service,
        label: stepdownChargeLabel(service, note, qty),
        note,
        qty,
        rate,
        amount,
        date: String(row?.date || "").slice(0, 10),
        billFileName: String(row?.billFileName || "").trim(),
        billFileData: String(row?.billFileData || ""),
        billFileType: String(row?.billFileType || "").trim(),
        addedBy: String(row?.addedBy || "").trim(),
        addedAt: Number(row?.addedAt || 0),
      };
    })
    .filter((row) => row.amount > 0 || row.service);
}

export function addStepdownCharge(order = {}, extras = {}, now = Date.now()) {
  const service = String(extras.service || "").trim();
  const option = STEPDOWN_CHARGE_OPTIONS.find((row) => row.id === service);
  if (!option) return { error: "Select a billing heading." };
  const note = String(extras.note || "").trim();
  if (service === "other" && !note) {
    return { error: "Enter the other heading used on this bill." };
  }
  const billFileName = String(extras.billFileName || extras.fileName || "").trim();
  const billFileData = String(extras.billFileData || extras.fileData || "");
  const billFileType = String(extras.billFileType || extras.fileType || "").trim();
  if (service === "medicine" && !billFileData) {
    return { error: "Attach the medicine bill." };
  }
  const qty = Math.max(
    1,
    Math.min(90, Math.round(Number(extras.qty || extras.days || 1)))
  );
  if (stepdownChargeUsesDays(service) && !(Number(extras.qty || extras.days) > 0)) {
    return { error: "Enter No of Days for room rent." };
  }
  const rate = stepdownChargeUsesDays(service)
    ? stepdownDayRate(order)
    : money(extras.rate ?? extras.amount);
  if (!(rate > 0)) {
    return {
      error: stepdownChargeUsesDays(service)
        ? "Booking room rent is missing."
        : "Enter the charge amount.",
    };
  }
  const added = {
    id: `SDC-${now.toString(36)}-${qty}`,
    service,
    note,
    qty,
    rate,
    amount: money(rate * qty),
    date: String(extras.date || extras.chargeDate || "").slice(0, 10) ||
      (stepdownChargeUsesDays(service) ? "" : isoToday()),
    billFileName,
    billFileData,
    billFileType,
    addedBy: String(extras.addedBy || extras.inchargeName || "").trim(),
    addedAt: now,
  };
  const stayCharges = [...stepdownChargeRows(order), added];
  const next = { ...order, stayCharges };
  const total = stepdownBillTotal(next);
  return {
    stayCharges,
    billingStarted: true,
    total,
    saleRupees: total,
    lastCharge: added,
  };
}

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function createStepdownPatientAccount(order = {}, extras = {}, now = Date.now()) {
  if (order?.patientAccountId) {
    return {
      patientAccountId: order.patientAccountId,
      patientAccountCreatedAt: order.patientAccountCreatedAt || now,
      patientAccountName: order.patientAccountName || extras.patientName || "",
      patientAccountMobile: last10(order.patientAccountMobile || extras.mobile || order.mobile),
      patientAccountOpened: true,
    };
  }
  const bookingId = String(order?.bookingId || order?.id || extras.bookingId || "SD");
  const suffix = bookingId.replace(/^MH-SD-?/i, "").replace(/[^A-Za-z0-9]/g, "").slice(-8) ||
    now.toString(36).slice(-6).toUpperCase();
  return {
    patientAccountId: `MH-SD-ACC-${suffix}`,
    patientAccountCreatedAt: now,
    patientAccountName:
      String(extras.patientName || order.patientName || order.fullName || order.name || "").trim(),
    patientAccountMobile: last10(extras.mobile || order.mobile || order.mobileNumber),
    patientAccountOpened: true,
  };
}
