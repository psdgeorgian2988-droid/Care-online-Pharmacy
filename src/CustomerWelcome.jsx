import { useEffect, useState } from "react";
import { commitHash } from "./hashRoute";
import WelcomeSlideshow from "./WelcomeSlideshow";
import { APP_PREVIEW_KEY, writeAppRole } from "./appRuntime";
import {
  clearCustomerEntryChosen,
  requestWelcomePage,
} from "./authSession";

export {
  clearCustomerEntryChosen,
  markCustomerEntryChosen,
  needsCustomerWelcome,
} from "./authSession";

const FLASH_MS = 2200;

/** Open the customer welcome from any logo click. */
export function openWelcomePage() {
  requestWelcomePage();
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
  const [mode, setMode] = useState("flash");

  useEffect(() => {
    if (mode !== "flash") return undefined;
    const timer = window.setTimeout(() => setMode("choose"), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const openOpsPage = (event, hash) => {
    event.preventDefault();
    commitHash(hash);
    onDone?.();
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

  return (
    <div className="app-first is-home is-login-screen">
      <div className="app-first-stage" aria-hidden="true">
        <WelcomeSlideshow />
      </div>
      <div className="app-first-center is-login is-bottom">
        <div className="app-first-actions is-entry" aria-label="Get started">
          <a className="app-first-btn is-main" href="#login">
            Login
          </a>
          <div className="app-first-actions-row">
            <a className="app-first-btn is-partner" href="#partner-desk" onClick={(event) => openOpsPage(event, "#partner-desk")}>
              Partner Login
            </a>
            <a className="app-first-btn is-admin" href="#admin" onClick={(event) => openOpsPage(event, "#admin")}>
              Admin Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
