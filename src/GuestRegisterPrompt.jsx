import { useState } from "react";
import { useLoginSession } from "./authSession";

const DISMISS_KEY = "mediHomeGuestOrderHint";
const RETURN_KEY = "mediHomeReturnHash";

export function rememberReturnHash() {
  try {
    const hash = window.location.hash || "#home";
    sessionStorage.setItem(RETURN_KEY, hash);
  } catch {
    /* ignore */
  }
}

export function consumeReturnHash() {
  try {
    const next = sessionStorage.getItem(RETURN_KEY) || "";
    sessionStorage.removeItem(RETURN_KEY);
    if (next.startsWith("#") && next !== "#login" && next !== "#register") {
      return next;
    }
  } catch {
    /* ignore */
  }
  return "#home";
}

export default function GuestRegisterPrompt() {
  const user = useLoginSession();
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (user || hidden) return null;

  const continueAsGuest = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <>
      <style>{styles}</style>
      <aside className="guest-reg-prompt" aria-label="Register for offers">
        <p className="guest-reg-title">Order As A Guest, Or Register For More</p>
        <p className="guest-reg-copy">
          You can order now with your phone number, address and prescription if
          needed. Register to get year-round discounts and offers, and collect
          MediHome points to use as service discounts.
        </p>
        <div className="guest-reg-actions">
          <a href="#register" className="guest-reg-primary" onClick={rememberReturnHash}>
            Register
          </a>
          <a href="#login" className="guest-reg-secondary" onClick={rememberReturnHash}>
            Login
          </a>
          <button type="button" className="guest-reg-ghost" onClick={continueAsGuest}>
            Continue as guest
          </button>
        </div>
      </aside>
    </>
  );
}

const styles = `
.guest-reg-prompt{grid-column:1/-1;width:100%;box-sizing:border-box;margin:0 0 4px;padding:12px 14px;border:1px solid #c5e0d4;border-radius:12px;background:#f3fbf6;display:grid;gap:8px}
.guest-reg-title{margin:0;font-size:13px;font-weight:800;color:#0f5c45}
.guest-reg-copy{margin:0;font-size:12px;line-height:1.45;color:#34546b}
.guest-reg-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.guest-reg-primary,.guest-reg-secondary,.guest-reg-ghost{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 12px;border-radius:8px;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}
.guest-reg-primary{background:#1e8a73;color:#fff;border:1px solid #1e8a73}
.guest-reg-secondary{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
.guest-reg-ghost{background:transparent;color:#34546b;border:1px solid transparent}
@media (max-width:800px){.guest-reg-primary,.guest-reg-secondary,.guest-reg-ghost{flex:1 1 auto}}
`;
