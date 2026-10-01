import { isCompletedOrder, serviceKind } from "./orderStatus.js";

const KIND_TO_REVIEW_SERVICE = {
  medicine: "medicines",
  lab: "labs",
  radiology: "radiology",
  homecare: "homecare",
  vaccination: "vaccination",
  doctor: "doctor",
  psychologist: "psychologist",
  stepdown: "stepdown",
  ambulance: "ambulance",
};

const REVIEW_SERVICE_TO_KIND = {
  medicines: "medicine",
  labs: "lab",
  radiology: "radiology",
  homecare: "homecare",
  vaccination: "vaccination",
  doctor: "doctor",
  psychologist: "psychologist",
  stepdown: "stepdown",
  ambulance: "ambulance",
};

export function orderReviewKey(order) {
  if (order == null) return "";
  if (typeof order === "string" || typeof order === "number") {
    return String(order).trim();
  }
  return String(order.id || order.bookingId || order.requestId || "").trim();
}

export function reviewServiceForOrder(order) {
  return KIND_TO_REVIEW_SERVICE[serviceKind(order)] || "other";
}

export function orderKindForReviewService(service) {
  return REVIEW_SERVICE_TO_KIND[String(service || "").toLowerCase()] || "";
}

export function findReviewForOrder(reviews, order) {
  const key = orderReviewKey(order);
  if (!key) return null;
  const list = Array.isArray(reviews) ? reviews : [];
  return (
    list.find((row) => {
      const stored = String(row?.orderId || row?.referenceId || "").trim();
      return stored === key;
    }) || null
  );
}

/** Customer completed orders only. Share when none is saved; read when one is. */
export function orderFeedbackActions(order, audience = "customer", reviews = []) {
  const who = String(audience || "customer").toLowerCase();
  if (who !== "customer" || !isCompletedOrder(order)) {
    return { share: false, read: false, review: null };
  }
  const review = findReviewForOrder(reviews, order);
  return {
    share: !review,
    read: Boolean(review),
    review,
  };
}

export function feedbackHashForOrder(order) {
  const id = orderReviewKey(order);
  return id ? `#feedback?id=${encodeURIComponent(id)}` : "#feedback";
}

export function reviewHashForOrder(order) {
  const id = orderReviewKey(order);
  return id ? `#reviews?id=${encodeURIComponent(id)}` : "#reviews";
}

export function matchStoredOrder(orders, id) {
  const key = orderReviewKey(id);
  if (!key) return null;
  return (
    (Array.isArray(orders) ? orders : []).find((order) => {
      const ids = [order?.id, order?.bookingId, order?.requestId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return ids.includes(key);
    }) || null
  );
}
