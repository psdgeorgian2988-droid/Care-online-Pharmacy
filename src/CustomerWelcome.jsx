import { useEffect, useState } from "react";
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
import LogoMark from "./LogoMark";
import AppHeader from "./AppHeader";
import { authEntryHref } from "./authSession";

const FLASH_MS = 2200;
const ENTRY_CHOSEN_KEY = "mediHomeEntryChosen";

function entryStore() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function markCustomerEntryChosen(store = entryStore()) {
  try {
    store?.setItem?.(ENTRY_CHOSEN_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function needsCustomerWelcome(user, store = entryStore()) {
  if (user) return false;
  try {
    return store?.getItem?.(ENTRY_CHOSEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export default function CustomerWelcome({ onDone } = {}) {
  const [mode, setMode] = useState("flash"); // flash | choose | guest
  const [form, setForm] = useState(() => emptyGuestCheckout());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode !== "flash") return undefined;
    const timer = window.setTimeout(() => setMode("choose"), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

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
    markCustomerEntryChosen();
    onDone?.();
    try {
      window.dispatchEvent(new Event("mediHomeSession"));
    } catch {
      /* ignore */
    }
    goToHash("#home");
  };

  if (mode === "flash") {
    return (
      <div className="app-first is-flash" role="status" aria-live="polite">
        <div className="app-first-center is-flash-copy">
          <p className="app-first-welcome">
            A Complete Online Healthcare Ecosystem
          </p>
        </div>
      </div>
    );
  }

  if (mode === "guest") {
    return (
      <div className="app-first is-guest">
        <AppHeader user={null} route="#home" />
        <section className="app-first-card" aria-label="Guest delivery details">
          <strong className="app-first-name">{SITE.name}</strong>
          <h2>Guest order</h2>
          <form className="app-first-form" onSubmit={saveGuest}>
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
            <div className="app-first-actions">
              <button type="submit" className="app-first-btn">
                Continue
              </button>
              <button
                type="button"
                className="app-first-btn is-quiet"
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
    <div className="app-first is-home">
      <div className="app-first-center is-login">
        <div className="app-first-logo">
          <span className="app-first-logo-ring">
            <LogoMark />
          </span>
          <strong>MediHome</strong>
        </div>
        <div className="app-first-actions" aria-label="Get started">
          <a
            className="app-first-btn"
            href={authEntryHref()}
            onClick={() => markCustomerEntryChosen()}
          >
            Login
          </a>
          <button
            type="button"
            className="app-first-btn is-quiet"
            onClick={() => {
              if (guestHasCheckout()) {
                markCustomerEntryChosen();
                onDone?.();
                goToHash("#home");
                return;
              }
              setMode("guest");
            }}
          >
            Order as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
