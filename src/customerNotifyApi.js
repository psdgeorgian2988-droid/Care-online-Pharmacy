import { apiFetch } from "./apiBase.js";
import { persistOrder, withTracking } from "./orderTracking";

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export async function fetchCustomerNotifications(mobile) {
  const id = last10(mobile);
  if (id.length !== 10) return { notifications: [] };
  return parseResponse(
    await apiFetch(`/api/customer/notifications?mobile=${encodeURIComponent(id)}`)
  );
}

export async function replyToOfferedSlot(order, decision) {
  const id = String(order?.bookingId || order?.id || "").trim();
  const mobile = last10(order?.mobile || order?.mobileNumber);
  if (!id) throw new Error("Booking id is missing.");
  const data = await parseResponse(
    await apiFetch(`/api/orders/${encodeURIComponent(id)}/slot-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, mobile }),
    })
  );
  const kind = data.order?.kind || data.order?.orderType || order?.kind || "radiology";
  return persistOrder(withTracking({ ...order, ...data.order }, kind));
}
