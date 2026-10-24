import { useEffect, useState } from "react";
import AddressFields from "./AddressFields.jsx";
import AutofillTrap from "./AutofillTrap";
import { goToHash } from "./hashRoute";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";
import {
  emptyGuestCheckout,
  validateGuestCheckout,
  writeGuestCheckout,
} from "./guestCheckout";
import LogoMark from "./LogoMark";
import WelcomeSlideshow from "./WelcomeSlideshow";
import { APP_PREVIEW_KEY, writeAppRole } from "./appRuntime";
import {
  clearCustomerEntryChosen,
  markCustomerEntryChosen,
} from "./authSession";

export {
  clearCustomerEntryChosen,
  markCustomerEntryChosen,
  needsCustomerWelcome,
} from "./authSession";

const FLASH_MS = 2200;

/** Open the customer welcome (Login / Order as Guest) from any logo click. */
export function openWelcomePage() {
  clearCustomerEntryChosen();
  try {
    globalThis.localStorage?.setItem?.(APP_PREVIEW_KEY, "1");
  } catch {
    /* ignore */
  }
  writeAppRole("customer");

  const loc = globalThis.location;
  if (loc) {
    const url = new URL(loc.href);
    url.searchParams.set("app", "1");
    url.hash = "#home";
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${loc.pathname}${loc.search}${loc.hash}`;
    if (next !== current) {
      loc.assign(next);
      return;
    }
  }

  try {
    globalThis.dispatchEvent?.(new HashChangeEvent("hashchange"));
  } catch {
    try {
      globalThis.dispatchEvent?.(new Event("hashchange"));
    } catch {
      /* ignore */
    }
  }
  try {
    globalThis.dispatchEvent?.(new Event("mediHomeSession"));
  } catch {
    /* ignore */
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

  const enterAsGuest = () => {
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
        <section className="app-first-card" aria-label="Guest delivery details">
          <div className="app-first-card-logo" aria-hidden="true">
            <LogoMark size="lg" />
          </div>
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
    <div className="app-first is-home is-login-screen">
      <div className="app-first-stage" aria-hidden="true">
        <WelcomeSlideshow />
      </div>
      <div className="app-first-center is-login is-bottom">
        <div className="app-first-actions is-entry" aria-label="Get started">
          <div className="app-first-actions-row">
            <a className="app-first-btn" href="#login">
              Login / Register
            </a>
            <button
              type="button"
              className="app-first-btn is-quiet"
              onClick={enterAsGuest}
            >
              Order as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
