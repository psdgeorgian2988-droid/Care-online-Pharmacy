import { useEffect, useRef, useState } from "react";
import { readUserProfile } from "./addressFields";
import { fetchCustomerNotifications } from "./customerNotifyApi";
import {
  isAwaitingCustomerSlotConfirm,
} from "./orderConfirm";
import { loadAllOrders, refreshOrderFromServer } from "./orderTracking";
import SlotOfferCard from "./SlotOfferCard";

function last10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function SlotOfferBanner() {
  const [order, setOrder] = useState(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const profile = readUserProfile();
      const mobile = last10(profile?.mobile);
      const local = loadAllOrders().find((row) => isAwaitingCustomerSlotConfirm(row));
      if (local && !cancelled) {
        const latest = (await refreshOrderFromServer(local.bookingId || local.id)) || local;
        if (!cancelled) setOrder(latest);
      } else if (!cancelled) {
        setOrder(null);
      }
      if (mobile.length === 10) {
        try {
          const data = await fetchCustomerNotifications(mobile);
          const unread = (data.notifications || []).find(
            (row) => row.type === "slot_offer" && !row.readAt
          );
          if (unread && !seenRef.current.has(unread.id)) {
            seenRef.current.add(unread.id);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(unread.title || "New time slot offered", {
                body: unread.body || "A partner offered a new appointment slot.",
              });
            }
            if (!local) {
              const latest = await refreshOrderFromServer(unread.orderId);
              if (!cancelled && latest) setOrder(latest);
            }
          }
        } catch {
          /* ignore offline */
        }
      }
    };
    tick();
    const timer = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!order) return null;

  return (
    <div className="slot-offer-banner">
      <SlotOfferCard
        order={order}
        onResolved={(next) => {
          setOrder(isAwaitingCustomerSlotConfirm(next) ? next : null);
        }}
      />
    </div>
  );
}
