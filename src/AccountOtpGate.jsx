import { useState } from "react";
import {
  issueAccountOtp,
  maskMobile,
  peekAccountOtp,
  verifyAccountOtp,
} from "./accountOtp";
import { noContactMobileProps } from "./noContactAutofill";

export default function AccountOtpGate({
  mobile,
  title = "Verify With OTP To Edit",
  onVerified,
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(() => peekAccountOtp());
  const [error, setError] = useState("");

  const sendOtp = () => {
    const result = issueAccountOtp(mobile);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(result);
    setCode("");
    setError("");
  };

  const confirmOtp = (event) => {
    event.preventDefault();
    const result = verifyAccountOtp(mobile, code);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    onVerified?.(result.mobile);
  };

  return (
    <>
      <style>{styles}</style>
      <section className="otp-gate" aria-label="Account edit OTP">
        <p className="otp-title">{title}</p>
        <p>
          Only the person who created this account can change it. We send an OTP
          to {maskMobile(mobile) || "your account mobile"}.
        </p>
        <div className="otp-actions">
          <button type="button" onClick={sendOtp}>
            {sent ? "Resend OTP" : "Send OTP"}
          </button>
        </div>
        {sent ? (
          <form className="otp-form" onSubmit={confirmOtp}>
            <p className="otp-demo">
              OTP sent. Demo OTP: <strong>{sent.code}</strong>
            </p>
            <label htmlFor="account-edit-otp">
              Enter OTP <span>*</span>
            </label>
            <input
              id="account-edit-otp"
              maxLength="4"
              placeholder="4-digit OTP"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              {...noContactMobileProps}
            />
            <button type="submit">Verify OTP</button>
          </form>
        ) : null}
        {error ? <p className="otp-error">{error}</p> : null}
      </section>
    </>
  );
}

const styles = `
.otp-gate{padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd;display:grid;gap:8px}
.otp-title{margin:0;font-size:13px;font-weight:800;color:#1a6b7a}
.otp-gate p{margin:0;font-size:13px;line-height:1.4;color:#34546b}
.otp-demo{color:#1a6b7a;font-weight:700}
.otp-actions,.otp-form{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
.otp-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
.otp-form .otp-demo,.otp-form label{grid-column:1/-1}
.otp-gate label{margin:0;font-size:12px;font-weight:700;color:#34546b}
.otp-gate label span{color:#e34d4d}
.otp-gate input{height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.otp-gate button{border:1px solid #1a6b7a;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;padding:8px 12px;cursor:pointer;height:38px}
.otp-error{color:#d84b4b;font-size:12px;font-weight:700}
`;
