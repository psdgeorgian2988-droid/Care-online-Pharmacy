import { useMemo, useState } from "react";
import SocialLinks from "./SocialLinks";
import { useFeatures } from "./featureFlags";
import { FEATURE_CATALOG, featureEnabled } from "./salesReport";
import { useLoginSession } from "./authSession";
import { readUserProfile } from "./addressFields";
import { goToHash } from "./hashRoute";
import {
  kindLabel,
  loadAllOrders,
  trackHref,
} from "./orderTracking";
import { CARE_WHATSAPP } from "./careChat.js";
import { SITE } from "./siteMeta.js";
import CustomerWelcome, { needsCustomerWelcome } from "./CustomerWelcome";

const ORDER_WHATSAPP = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I want to place an order."
)}`;
const RX_WHATSAPP = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I want to upload my prescription and place an order."
)}`;

const CALL = `tel:${SITE.phoneTel}`;
const MAIL = `mailto:${SITE.email}`;
const WA = `https://wa.me/${SITE.whatsapp}`;

const SERVICE_MARK = {
  medicine: "Rx",
  lab: "Lab",
  radiology: "Scan",
  homecare: "Care",
  vaccination: "Vac",
  psychologist: "Mind",
  stepdown: "Step",
  ambulance: "Amb",
  reports: "Rep",
  education: "Edu",
  scanDelivery: "Scan",
};

const FLYER_SRC = "/og-image.svg";

function openExternal(url, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
    return;
  }
  window.location.assign(url);
}

function locationLabel(profile) {
  const pin = String(profile.pinCode || "").replace(/\D/g, "").slice(0, 6);
  const city = String(profile.city || profile.area || "").trim();
  if (city && pin) return `${city} · ${pin}`;
  if (pin) return `PIN ${pin}`;
  if (city) return city;
  return "Set delivery location";
}

function activeOrderFromList(orders) {
  return (
    orders.find(
      (order) =>
        !order.trackCompleted &&
        String(order.trackStatus || order.status || "").toLowerCase() !== "done"
    ) || null
  );
}

function applyMedicineQuery(value) {
  const next = String(value || "").trim();
  try {
    sessionStorage.removeItem("mediHomeMedicineCategory");
    if (next) sessionStorage.setItem("mediHomeMedicineSearch", next);
    else sessionStorage.removeItem("mediHomeMedicineSearch");
  } catch {
    /* ignore */
  }
  goToHash(
    next
      ? `#medicine-search?q=${encodeURIComponent(next)}`
      : "#medicine-search"
  );
}

export default function CustomerHome({ onOpenMenu } = {}) {
  const features = useFeatures();
  const user = useLoginSession();
  const profile = useMemo(() => readUserProfile(), [user]);
  const [query, setQuery] = useState("");
  const [welcomeTick, setWelcomeTick] = useState(0);
  const activeOrder = useMemo(() => activeOrderFromList(loadAllOrders()), []);

  const services = FEATURE_CATALOG.filter(
    (row) => row.key !== "scanDelivery" && featureEnabled(features, row.key)
  ).map((row) => ({
    href: row.href,
    title: row.label.replace(" Consultation", "").replace("Health ", ""),
    mark: SERVICE_MARK[row.key] || "Go",
  }));

  if (needsCustomerWelcome(user)) {
    return (
      <CustomerWelcome
        key={welcomeTick}
        onDone={() => setWelcomeTick((n) => n + 1)}
      />
    );
  }

  return (
    <div className="app-home">
      <header className="app-home-top">
        <button
          type="button"
          className="app-home-icon-btn"
          aria-label="Open menu"
          onClick={() => onOpenMenu?.()}
        >
          Menu
        </button>
        <div className="app-home-brand">
          <strong>{SITE.name}</strong>
        </div>
        <div className="app-home-auth">
          {user ? (
            <a className="app-home-icon-btn" href="#profile">
              Profile
            </a>
          ) : (
            <>
              <a className="app-home-icon-btn is-quiet" href="#login">
                Login
              </a>
              <a className="app-home-icon-btn" href="#register">
                Register
              </a>
            </>
          )}
        </div>
      </header>

      <section className="app-home-flyer" aria-label="Featured">
        <img src={FLYER_SRC} alt="" />
        <div className="app-home-flyer-copy">
          <p>{SITE.name}</p>
          <strong>{SITE.tagline}</strong>
        </div>
      </section>

      <a className="app-home-location" href={user ? "#profile" : "#login"}>
        <span className="app-home-location-pin" aria-hidden="true" />
        <span>{locationLabel(profile)}</span>
        <span className="app-home-location-chevron" aria-hidden="true">
          ›
        </span>
      </a>

      {featureEnabled(features, "medicine") ? (
        <form
          className="app-home-search"
          onSubmit={(event) => {
            event.preventDefault();
            applyMedicineQuery(query);
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search medicines…"
            aria-label="Search medicines"
            enterKeyHint="search"
          />
          <button type="submit">Search</button>
        </form>
      ) : null}

      <div className="app-home-actions" aria-label="Place order">
        <a className="app-home-cta app-home-cta-call" href={CALL}>
          Call to order
        </a>
        <button
          type="button"
          className="app-home-cta app-home-cta-wa"
          onClick={(event) => openExternal(ORDER_WHATSAPP, event)}
        >
          WhatsApp order
        </button>
      </div>
      {featureEnabled(features, "medicine") ? (
        <button
          type="button"
          className="app-home-cta is-quiet app-home-cta-full"
          onClick={(event) => openExternal(RX_WHATSAPP, event)}
        >
          Upload prescription on WhatsApp
        </button>
      ) : null}

      {activeOrder ? (
        <section className="app-home-panel app-home-order is-live" aria-label="Active order">
          <div className="app-home-order-row">
            <div>
              <p className="app-home-panel-title">Live order</p>
              <p className="app-home-order-status">
                {activeOrder.trackLabel ||
                  activeOrder.status ||
                  kindLabel(activeOrder.kind) ||
                  "In progress"}
              </p>
            </div>
            <a className="app-home-cta app-home-cta-sm" href={trackHref(activeOrder.id)}>
              Track
            </a>
          </div>
        </section>
      ) : null}

      {services.length ? (
        <section aria-label="Services">
          <div className="app-home-section-head">
            <p className="app-home-panel-title">Services</p>
          </div>
          <div className="app-home-services is-3">
            {services.map((service) => (
              <a key={service.href + service.title} className="app-home-service" href={service.href}>
                <em>{service.mark}</em>
                <strong>{service.title}</strong>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="app-home-contact" aria-label="Contact us">
        <p className="app-home-panel-title">Contact us</p>
        <div className="app-home-contact-rows">
          <a href={CALL}>{SITE.phoneDisplay}</a>
          <a href={MAIL}>{SITE.email}</a>
          <a href={WA}>WhatsApp</a>
          <a href="#contact">More contact options</a>
        </div>
        <p className="app-home-contact-hours">{SITE.hours}</p>
        <SocialLinks className="app-home-social" showHandles layout="cards" />
      </section>
    </div>
  );
}
