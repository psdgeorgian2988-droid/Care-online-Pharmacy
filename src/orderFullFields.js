import {
  appointmentSlotLabel,
  isAwaitingCustomerSlotConfirm,
  isAwaitingPartnerConfirm,
} from "./orderConfirm.js";
import {
  isOnlinePayment,
  paymentMethodLabel,
  paymentMethodSummary,
} from "./paymentMethods.js";
import { orderPayableRupees, paymentPartsLabel } from "./partnerCollect.js";
import { maskMobile } from "./personFields.js";
import { orderCurrentStatus } from "./orderStatus.js";

export function orderRecordId(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "");
}

export function orderKind(order) {
  return String(order?.kind || order?.orderType || order?.serviceType || "medicine");
}

export function orderPatientName(order) {
  return (
    order?.patientName ||
    order?.fullName ||
    order?.name ||
    order?.bookedForName ||
    ""
  );
}

export function orderAddress(order) {
  return (
    order?.deliveryAddress ||
    order?.address ||
    order?.pickupAddress ||
    ""
  );
}

export function orderPin(order) {
  return String(order?.pinCode || order?.pin || "");
}

export function orderLineItems(order) {
  if (Array.isArray(order?.items) && order.items.length) return order.items;
  if (Array.isArray(order?.tests) && order.tests.length) return order.tests;
  const label = [order?.serviceLabel, order?.carePlanLabel].filter(Boolean).join(" · ");
  if (label) {
    return [
      {
        name: label,
        quantity: order?.durationDays || "",
        price: order?.total ?? order?.charges ?? "",
      },
    ];
  }
  if (order?.emergencyType) {
    return [
      {
        name:
          order.emergencyType === "emergency"
            ? "Emergency ambulance"
            : "Non-emergency ambulance",
        price: order?.total ?? order?.charges ?? "",
      },
    ];
  }
  return [];
}

export function itemsHeading(kind) {
  switch (String(kind || "").toLowerCase()) {
    case "lab":
      return "Laboratory Tests";
    case "radiology":
      return "Imaging Studies";
    case "homecare":
      return "Home Care";
    case "vaccination":
      return "Vaccination";
    case "psychologist":
      return "Psychologist Consultation";
    case "doctor":
      return "Doctor Appointment";
    case "stepdown":
      return "Step-Down Care";
    case "ambulance":
      return "Request";
    default:
      return "Medicines";
  }
}

export function formatOrderRupee(amount) {
  if (amount == null || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatOrderMobile(value, audience = "customer") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (audience === "customer") return maskMobile(raw) || raw;
  return raw;
}

export function orderTotal(order) {
  const named = order?.total ?? order?.charges ?? order?.split?.payableRupees;
  if (named != null && Number(named) > 0) return named;
  const fromItems = orderPayableRupees(order);
  return fromItems > 0 ? fromItems : named ?? null;
}

export function orderPartnerAssignment(order) {
  const name =
    order?.technicianName ||
    order?.partnerName ||
    order?.agentName ||
    "";
  const mobile =
    order?.technicianMobile ||
    order?.partnerMobile ||
    order?.agentMobile ||
    "";
  const org = order?.partner || order?.outletName || "";
  const role = order?.partnerRole || order?.agentRole || "";
  const assigned = Boolean(
    order?.partnerId ||
      order?.technicianName ||
      order?.partnerName ||
      (order?.partnerConfirmed && (org || name))
  );
  return {
    name,
    mobile,
    org,
    role,
    vehicle: order?.agentVehicle || "",
    unit: order?.agentUnit || "",
    assigned,
    confirmed: order?.partnerConfirmed === true,
    status: order?.partnerConfirmStatus || "",
  };
}

export function orderSlotLines(order) {
  const requested = [order?.requestedDate, order?.requestedTimeSlot]
    .filter(Boolean)
    .join(" · ");
  const offered = [order?.offeredDate, order?.offeredTimeSlot]
    .filter(Boolean)
    .join(" · ");
  const current = [order?.date || order?.appointmentDate, order?.timeSlot]
    .filter(Boolean)
    .join(" · ");
  return {
    requested,
    offered,
    current,
    label: appointmentSlotLabel(order),
    awaitingCustomer: isAwaitingCustomerSlotConfirm(order),
    awaitingPartner: isAwaitingPartnerConfirm(order),
  };
}

export function orderPaymentSummary(order, audience = "customer") {
  const method = order?.paymentMethod || "";
  const status = String(order?.paymentStatus || "").toLowerCase();
  const paid = status === "paid" || order?.paid === true;
  let methodText = "";
  if (status === "awaiting_partner" || isAwaitingPartnerConfirm(order)) {
    methodText = "After partner acceptance";
  } else if (
    status === "awaiting_payment" ||
    (method === "pending" && !paid)
  ) {
    methodText = "Pending — complete payment";
  } else if (method === "split" || (Array.isArray(order.paymentParts) && order.paymentParts.length > 1)) {
    methodText = paymentPartsLabel(
      order.paymentParts,
      audience === "customer" ? "Cash on delivery / visit" : "Cash / COD"
    );
  } else if (method) {
    methodText =
      audience === "customer"
        ? paymentMethodSummary(method, "Cash on delivery / visit")
        : isOnlinePayment(method)
          ? paymentMethodLabel(method)
          : "Cash / COD";
  }
  const statusText = paid
    ? order?.collector === "medihome" || order?.paidOn === "customer"
      ? "Paid · MediHome app"
      : order?.collector === "partner"
        ? "Paid · collected by partner"
        : "Paid"
    : status || "";
  const amount = formatOrderRupee(orderTotal(order));
  const showSplit = Boolean(audience === "staff" && order?.split);
  return {
    methodText,
    statusText,
    amount,
    paid,
    showSplit,
    sale: showSplit ? formatOrderRupee(order.split.saleRupees) : "",
    discount: showSplit ? formatOrderRupee(order.split.discountRupees) : "",
    coupon: showSplit ? order.split.couponCode || "" : "",
    platform: showSplit ? formatOrderRupee(order.split.platformRupees) : "",
    partner: showSplit ? formatOrderRupee(order.split.partnerRupees) : "",
    platformPercent: showSplit ? order.split.platformPercent : null,
    partnerPercent: showSplit ? order.split.partnerPercent : null,
  };
}

export function orderTrackLabel(order) {
  return orderCurrentStatus(order);
}

export function orderOutletLabel(order) {
  return String(order?.outletName || "").trim() || orderPin(order) || "—";
}

export function orderAssignedLabel(order) {
  const partner = orderPartnerAssignment(order);
  if (!partner.assigned) return "Unassigned";
  return partner.name || partner.org || "Assigned";
}

export function orderPaymentModeLabel(order, audience = "partner") {
  return orderPaymentSummary(order, audience).methodText || "—";
}

export function orderKindExtras(order) {
  const kind = orderKind(order);
  const rows = [];
  if (kind === "lab" || kind === "radiology") {
    rows.push({
      label: kind === "lab" ? "Collection Type" : "Appointment Type",
      value:
        order.visitType === "home"
          ? "Home Collection"
          : order.visitType
            ? "Centre Visit"
            : "",
    });
    if (order.partner) {
      rows.push({
        label: kind === "lab" ? "Lab Partner" : "Imaging Partner",
        value: order.partner,
      });
    }
    if (order.partnerGstin) {
      rows.push({ label: "Partner GSTIN", value: order.partnerGstin });
    }
    if (order.partnerDlNo) {
      rows.push({
        label: kind === "lab" ? "Lab licence" : "Centre licence",
        value: order.partnerDlNo,
      });
    }
  }
  if (kind === "homecare" || kind === "vaccination") {
    if (order.carePlanLabel) rows.push({ label: "Plan", value: order.carePlanLabel });
  }
  if (kind === "psychologist") {
    if (order.carePlanLabel) rows.push({ label: "Session", value: order.carePlanLabel });
    if (order.sessionMode) {
      rows.push({
        label: "Mode",
        value: order.sessionMode === "home" ? "Home visit" : "Video",
      });
    }
    if (order.concern) rows.push({ label: "Note", value: order.concern });
  }
  if (kind === "doctor") {
    if (order.carePlanLabel) rows.push({ label: "Doctor", value: order.carePlanLabel });
    if (order.sessionMode) {
      rows.push({
        label: "Appointment type",
        value:
          order.sessionMode === "home"
            ? "Home visit"
            : order.sessionMode === "video"
              ? "Video consultation"
              : "Clinic",
      });
    }
    if (order.concern) rows.push({ label: "Note", value: order.concern });
  }
  if (kind === "stepdown") {
    if (order.centreName) rows.push({ label: "Centre", value: order.centreName });
    if (order.durationDays) rows.push({ label: "Days", value: String(order.durationDays) });
    rows.push({
      label: "Ambulance to centre",
      value: order.needAmbulance ? "Yes (booked automatically)" : "No",
    });
    if (order.ambulanceRequestId) {
      rows.push({ label: "Ambulance ID", value: order.ambulanceRequestId });
    }
  }
  if (kind === "ambulance") {
    rows.push({
      label: "Type",
      value: order.emergencyType === "emergency" ? "Emergency" : "Non-emergency",
    });
    if (order.destinationName) {
      rows.push({
        label: "Drop at",
        value: [order.destinationName, order.destinationAddress, order.destinationFacilities]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }
  if (kind === "medicine") {
    if (order.prescription && !order.rxShare) {
      rows.push({ label: "Prescription", value: order.prescription });
    }
    if (order.outletGstin) rows.push({ label: "Outlet GSTIN", value: order.outletGstin });
    if (order.outletDlNo) rows.push({ label: "Outlet DL No.", value: order.outletDlNo });
  }
  if (order.reportFileName || order.reportFileData) {
    rows.push({
      label: "Report",
      value: order.reportFileName || "Report attached",
      href: order.reportFileData || "",
    });
  }
  return rows.filter((row) => row.value);
}
