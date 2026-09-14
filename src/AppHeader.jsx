import LogoMark from "./LogoMark";
import { goToHash } from "./hashRoute";
import { authEntryHref } from "./authSession";

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

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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

export default function AppHeader({ user, route } = {}) {
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
      <a className="app-chrome-brand-box" href="#home" aria-label="MediHome home">
        <LogoMark />
        <strong>MediHome</strong>
      </a>
      <a
        className={`app-chrome-btn is-end${user ? "" : " is-login"}`}
        href={user ? "#profile" : authEntryHref()}
        aria-label={user ? "Account" : "Login"}
        onClick={() => {
          if (user) return;
          try {
            sessionStorage.setItem("mediHomeEntryChosen", "1");
          } catch {
            /* ignore quota / private mode */
          }
        }}
      >
        {user ? <AccountIcon /> : "Login"}
      </a>
    </header>
  );
}
