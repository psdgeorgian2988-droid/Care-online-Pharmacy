import MediHomeLogoLink from "./MediHomeLogoLink";
import HeaderCart from "./HeaderCart";
import { goToHash } from "./hashRoute";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 5.5 8 12l7 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function goBack(route) {
  if (route && route !== "#home") {
    goToHash("#home");
    return;
  }
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }
  goToHash("#home");
}

export default function AppHeader({ route } = {}) {
  return (
    <header className="app-chrome-header">
      <button
        type="button"
        className="app-chrome-btn"
        aria-label="Back"
        onClick={() => goBack(route)}
      >
        <BackIcon />
      </button>
      <MediHomeLogoLink
        className="app-chrome-brand-box"
        size="md"
        aria-label="MediHome welcome"
      />
      <HeaderCart className="app-chrome-header-cart" />
    </header>
  );
}
