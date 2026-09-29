import MediHomeLogoLink from "./MediHomeLogoLink";
import HeaderCart from "./HeaderCart";
import { goBackHash } from "./hashRoute";

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

export default function AppHeader() {
  return (
    <header className="app-chrome-header">
      <button
        type="button"
        className="app-chrome-btn"
        aria-label="Back"
        onClick={() => goBackHash()}
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
