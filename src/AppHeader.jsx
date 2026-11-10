import MediHomeLogoLink from "./MediHomeLogoLink";
import HeaderCart from "./HeaderCart";
import CustomerLogOut from "./CustomerLogOut.jsx";
import { hasAccountSession } from "./authSession";
import { goBackHash, parseAppHash } from "./hashRoute";
import { useEffect, useState } from "react";

const ACCOUNT_HEADER_ROUTES = new Set([
  "#profile",
  "#home",
  "#medicine-search",
  "#labs",
  "#homecare",
  "#vaccination",
  "#doctor",
  "#psychologist",
  "#stepdown",
  "#ambulance",
  "#reports",
  "#prescription",
  "#checkout",
  "#myorders",
  "#education",
  "#feedback",
  "#reviews",
  "#scan",
  "#track",
]);

function accountHidesBack(hash) {
  if (!hasAccountSession()) return false;
  const { route } = parseAppHash(hash);
  return ACCOUNT_HEADER_ROUTES.has(route);
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 6.2 8 12l6.5 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 12H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AppHeader({ hideCart = false, hideBack = false } = {}) {
  const [hash, setHash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash));
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const hideAccountBack = hideBack || accountHidesBack(hash);

  return (
    <header className={`app-chrome-header${hideAccountBack ? " is-no-back" : ""}`}>
      {hideAccountBack ? null : (
        <button type="button" className="app-chrome-back" aria-label="Back" onClick={() => goBackHash()}>
          <BackIcon />
        </button>
      )}
      <MediHomeLogoLink
        className="app-chrome-brand-box"
        size="md"
        aria-label="MediHome welcome"
      />
      <div className="app-chrome-end">
        <CustomerLogOut className="app-chrome-logout" />
        {hideCart ? null : <HeaderCart className="app-chrome-header-cart" />}
      </div>
    </header>
  );
}
