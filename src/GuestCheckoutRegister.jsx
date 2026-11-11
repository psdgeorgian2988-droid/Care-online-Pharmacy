import { useEffect, useState } from "react";
import { lookupAccountIdentity } from "./accountSync";
import { goToHash } from "./hashRoute";
import { noContactMobileProps } from "./noContactAutofill";
import { openKnownAccount } from "./otpLogin";

function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export default function GuestCheckoutRegister({
  details = {},
  open = false,
  onSkip,
  onRegistered,
}) {
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!open) return undefined;
    setMobile(digits(details.mobile || details.mobileNumber));
    setBusy(false);
    setStatus({ type: "", text: "" });
    const onKey = (event) => {
      if (event.key === "Escape") onSkip?.();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, details.mobile, details.mobileNumber]);

  if (!open) return null;

  const logIn = async (event) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setStatus({ type: "error", text: "Enter a valid 10-digit mobile number." });
      return;
    }
    setBusy(true);
    const result = await lookupAccountIdentity({ mobile });
    setBusy(false);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error || "Could not check this account." });
      return;
    }
    if (result.state === "register" || !result.account) {
      try {
        sessionStorage.setItem("mediHomeRegisterDraft", JSON.stringify({ mobile }));
      } catch {
        /* the register form can still be filled by hand */
      }
      onSkip?.();
      goToHash("#register");
      return;
    }
    openKnownAccount({
      account: result.account,
      mobile: result.account.mobile || mobile,
      delivery: { ...details, mobile: result.account.mobile || mobile },
    });
    onRegistered?.();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="guest-pay-overlay" role="presentation" onClick={onSkip}>
        <div
          className="guest-pay-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-pay-title"
          onClick={(event) => event.stopPropagation()}
        >
          <form className="guest-pay-form" onSubmit={logIn}>
            <p className="guest-pay-kicker">MediHome</p>
            <h2 id="guest-pay-title">Log in</h2>
            <p className="guest-pay-reuse">
              Enter the mobile number for this order. The delivery address is saved on the account.
            </p>
            <label className="guest-pay-mail">
              Mobile number
              <input
                name="mobile"
                inputMode="numeric"
                maxLength="10"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(event) => {
                  setMobile(digits(event.target.value));
                  setStatus({ type: "", text: "" });
                }}
                {...noContactMobileProps}
              />
            </label>
            {status.text ? (
              <small className={status.type === "error" ? "guest-pay-error" : "guest-pay-ok"}>
                {status.text}
              </small>
            ) : null}
            <div className="guest-pay-actions">
              <button type="submit" className="guest-pay-btn" disabled={busy}>
                {busy ? "Please wait…" : "Login"}
              </button>
              <button type="button" className="guest-pay-btn is-ghost" onClick={onSkip}>
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = `
.guest-pay-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,50,70,.5)}
.guest-pay-dialog{width:min(440px,100%);padding:22px 20px 18px;border-radius:14px;background:#fff;border:1px solid #e4ecef;box-shadow:0 18px 48px rgba(20,50,70,.28);color:#143246}
.guest-pay-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#1a6b7a}
.guest-pay-dialog h2{margin:0 0 10px;font-size:20px;font-weight:800;color:#143246}
.guest-pay-reuse{margin:0 0 12px;font-size:13px;font-weight:700;color:#34546b;line-height:1.4}
.guest-pay-mail{display:grid;gap:4px;font-size:12px;font-weight:700;color:#1a6b7a}
.guest-pay-mail input{height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;font-weight:500;color:#143246}
.guest-pay-form{display:grid;gap:8px}
.guest-pay-actions{display:flex;flex-wrap:wrap;gap:8px}
.guest-pay-btn{flex:1;min-height:42px;border:none;border-radius:8px;background:#1e8a73;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.guest-pay-btn.is-ghost{background:#fff;color:#1a6b7a;border:1px solid #d7e2e9}
.guest-pay-error{color:#9b2c2c;font-size:12px;font-weight:700}
.guest-pay-ok{color:#1c9b61;font-size:12px;font-weight:700}
`;
