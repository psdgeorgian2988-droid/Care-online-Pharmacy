import { DEFAULT_OUTLET, outletForPin } from "./deliveryOutlets.js";
import { MEDIHOME_BILLING, findDiagnosticParty } from "./diagnosticPartners.js";

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function formatInr(value) {
  return `₹${money(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function recordKind(order) {
  return String(order?.kind || order?.orderType || order?.serviceType || "medicine");
}

function recordId(order, kind = recordKind(order)) {
  if (kind === "ambulance") return String(order?.requestId || order?.id || "");
  return String(order?.bookingId || order?.id || "");
}

function kindLabel(kind) {
  switch (kind) {
    case "lab":
      return "Laboratory Test";
    case "radiology":
      return "Radiology & Imaging";
    case "homecare":
      return "Home Care";
    case "vaccination":
      return "Vaccination";
    case "psychologist":
      return "Psychologist Consultation";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Ambulance";
    default:
      return "Medicine Order";
  }
}

function partyFromOutlet(outlet) {
  if (!outlet) return null;
  return {
    id: outlet.id,
    name: outlet.name,
    tradeName: outlet.name,
    area: outlet.area || "",
    address: outlet.address || `${outlet.area || ""}`.trim(),
    phone: outlet.phone || MEDIHOME_BILLING.phone,
    gstin: outlet.gstin || "",
    dlNo: outlet.dlNo || "",
    licenseLabel: outlet.dlNo ? "DL No." : "",
    source: "retail",
  };
}

export function billingPartyFor(order) {
  const kind = recordKind(order);
  if (kind === "medicine") {
    const outlet =
      outletForPin(order?.pinCode || order?.pin) ||
      (order?.outletId || order?.outletGstin || order?.outletDlNo
        ? {
            id: order.outletId,
            name: order.outletName,
            area: order.outletArea,
            phone: order.outletPhone,
            gstin: order.outletGstin,
            dlNo: order.outletDlNo,
            address: order.outletAddress,
          }
        : DEFAULT_OUTLET);
    return partyFromOutlet(outlet);
  }
  if (kind === "lab" || kind === "radiology") {
    const found = findDiagnosticParty(kind, {
      id: order?.partnerId || order?.preferredLabId,
      name: order?.partner || order?.preferredLab,
    });
    if (found) {
      return {
        id: found.id,
        name: found.name,
        tradeName: found.name,
        area: found.area,
        address: found.address,
        phone: MEDIHOME_BILLING.phone,
        gstin: found.gstin,
        dlNo: found.dlNo,
        licenseLabel: found.licenseLabel || (kind === "lab" ? "Lab Licence No." : "AERB / Centre Licence No."),
        source: kind,
      };
    }
    if (order?.partnerGstin || order?.partner || order?.preferredLab) {
      return {
        id: order.partnerId || "",
        name: order.partner || order.preferredLab || "Diagnostics partner",
        tradeName: order.partner || order.preferredLab || "",
        area: order.partnerArea || "",
        address: order.partnerAddress || "",
        phone: MEDIHOME_BILLING.phone,
        gstin: order.partnerGstin || "",
        dlNo: order.partnerDlNo || "",
        licenseLabel:
          kind === "lab" ? "Lab Licence No." : "AERB / Centre Licence No.",
        source: kind,
      };
    }
  }
  return { ...MEDIHOME_BILLING, source: "medihome" };
}

function billLines(order) {
  const items = Array.isArray(order?.items) && order.items.length
    ? order.items
    : Array.isArray(order?.tests)
      ? order.tests
      : [];
  if (items.length) {
    return items.map((item, index) => {
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));
      const rate = money(item.price ?? item.mrp ?? item.rate ?? 0);
      return {
        sno: index + 1,
        name: item.name || item.salt || "Item",
        detail: [item.salt, item.strength, item.packSize].filter(Boolean).join(" · "),
        qty,
        rate,
        amount: money(rate * qty),
      };
    });
  }
  const label = order?.carePlanLabel || order?.serviceLabel || kindLabel(recordKind(order));
  const amount = money(order?.total ?? order?.charges ?? 0);
  return [{ sno: 1, name: label, detail: "", qty: 1, rate: amount, amount }];
}

function buyerFrom(order) {
  return {
    name:
      order?.fullName ||
      order?.patientName ||
      order?.name ||
      "Customer",
    mobile: order?.mobileNumber || order?.mobile || "",
    address:
      order?.deliveryAddress ||
      order?.address ||
      order?.pickupAddress ||
      "",
    pin: order?.pinCode || order?.pin || "",
  };
}

export function buildOrderBill(order) {
  const kind = recordKind(order);
  const seller = billingPartyFor(order);
  const lines = billLines(order).map((line) => ({
    ...line,
    amount: money(line.amount || line.rate * line.qty),
  }));
  const lineTotal = money(lines.reduce((sum, line) => sum + line.amount, 0));
  const payable = money(order?.total ?? order?.charges ?? lineTotal);
  const sale = money(order?.saleRupees ?? lineTotal);
  const discount = money(order?.discountRupees ?? Math.max(0, sale - payable));
  const id = recordId(order, kind) || "DRAFT";
  return {
    kind,
    kindLabel: kindLabel(kind),
    invoiceNo: `MH-BILL-${id}`,
    billedOnMediHomeGst: seller.source === "medihome",
    seller,
    buyer: buyerFrom(order),
    date: order?.date || order?.bookedAt || order?.requestedAt || "",
    payment:
      order?.paymentMethod === "online" ? "Paid online" : "Cash on delivery / visit",
    couponCode: order?.couponCode || "",
    lines,
    sale,
    discount,
    payable,
    formatInr,
  };
}

export { formatInr, MEDIHOME_BILLING };
