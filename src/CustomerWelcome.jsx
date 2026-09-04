import { useState } from "react";
import AddressFields from "./AddressFields.jsx";
import AutofillTrap from "./AutofillTrap";
import { goToHash } from "./hashRoute";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";
import {
  emptyGuestCheckout,
  guestHasCheckout,
  validateGuestCheckout,
  writeGuestCheckout,
} from "./guestCheckout";
import { SITE } from "./siteMeta.js";

export function needsCustomerWelcome(user) {
  if (user) return false;
  return !guestHasCheckout();
}

export default function CustomerWelcome({ onDone } = {}) {
  const [mode, setMode] = useState("choose"); // choose | guest
  const [form, setForm] = useState(() => emptyGuestCheckout());
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const saveGuest = (event) => {
    event.preventDefault();
    const nextErrors = validateGuestCheckout(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    writeGuestCheckout(form);
    onDone?.();
    try {
      window.dispatchEvent(new Event("mediHomeSession"));
    } catch {
      /* ignore */
    }
    goToHash("#home");
  };

  if (mode === "guest") {
    return (
      <div className="app-welcome is-gate">
        <section className="app-welcome-card app-welcome-guest" aria-label="Guest delivery details">
          <strong className="app-welcome-brand-mark">{SITE.name}</strong>
          <h1>Guest order</h1>
          <form className="app-welcome-form" onSubmit={saveGuest}>
            <AutofillTrap />
            <label>
              Name (optional)
              <input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                placeholder="Your name"
                {...noContactNameProps}
              />
            </label>
            <label>
              Mobile number
              <input
                name="mobile"
                value={form.mobile || ""}
                onChange={handleChange}
                placeholder="10-digit mobile"
                maxLength={10}
                {...noContactMobileProps}
              />
              {errors.mobile ? <small>{errors.mobile}</small> : null}
            </label>

            <AddressFields
              idPrefix="guest-welcome"
              values={form}
              errors={errors}
              onChange={handleChange}
              showUseMyLocation
            />

            <div className="app-welcome-actions is-stack">
              <button type="submit" className="app-welcome-btn">
                Continue
              </button>
              <button
                type="button"
                className="app-welcome-btn is-quiet"
                onClick={() => {
                  setMode("choose");
                  setErrors({});
                }}
              >
                Back
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-welcome is-gate is-choose">
      <div className="app-welcome-center">
        <header className="app-welcome-hero">
          <span className="app-welcome-logo" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <rect width="40" height="40" rx="9" fill="#1a6b7a" />
              <path
                d="M20 8.2 32.4 19.2h-3V31.2H10.6V19.2h-3L20 8.2z"
                fill="#ffffff"
              />
              <path
                d="M19 17.5h2v3.3h3.3v2H21v3.3h-2v-3.3h-3.3v-2H19v-3.3z"
                fill="#1a6b7a"
              />
            </svg>
          </span>
          <h1 className="app-welcome-brand-mark">{SITE.name}</h1>
          <p className="app-welcome-tagline">
            A COMPLETE ONLINE HEALTHCARE ECOSYSTEM
          </p>
        </header>
        <div className="app-welcome-actions is-stack" aria-label="Get started">
          <a className="app-welcome-btn" href="#login">
            Login / Register
          </a>
          <button
            type="button"
            className="app-welcome-btn is-quiet"
            onClick={() => setMode("guest")}
          >
            Order as guest
          </button>
        </div>
      </div>
    </div>
  );
}
