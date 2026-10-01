import { useState } from "react";
import { confirmPartnerPasswordReset, requestPartnerPasswordReset } from "./partnerApi";
import { partnerResetDeliveryMessage } from "./partnerResetCopy";

export default function PartnerForgotPassword({ initialMobile = "", onCancel, onDone }) {
  const [mobile, setMobile] = useState(String(initialMobile || "").replace(/\D/g, "").slice(0, 10));
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter the 10-digit registered mobile number.");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const data = await requestPartnerPasswordReset(mobile);
      setSent(true);
      setOtp("");
      setInfo(partnerResetDeliveryMessage(data));
    } catch (err) {
      setError(err.message || "Could not send the OTP.");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      setError("Password must be exactly 6 digits.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPartnerPasswordReset({ mobile, otp, password });
      onDone?.();
    } catch (err) {
      setError(err.message || "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="service-form admin-login" onSubmit={sent ? savePassword : requestOtp}>
      <p className="admin-hint">
        Enter the mobile that is this partner&apos;s login ID. An OTP is texted there when an SMS gateway is configured.
      </p>
      <div className="field">
        <label htmlFor="partner-forgot-mobile">Registered mobile</label>
        <input
          id="partner-forgot-mobile"
          inputMode="numeric"
          autoComplete="username"
          placeholder="10-digit mobile"
          maxLength={10}
          value={mobile}
          onChange={(event) => {
            setMobile(event.target.value.replace(/\D/g, "").slice(0, 10));
            setSent(false);
            setInfo("");
          }}
        />
      </div>
      {sent ? (
        <>
          {info ? <p className="admin-hint">{info}</p> : null}
          <div className="field">
            <label htmlFor="partner-forgot-otp">OTP</label>
            <input
              id="partner-forgot-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <div className="field">
            <label htmlFor="partner-forgot-password">New password</label>
            <input
              id="partner-forgot-password"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="6-digit password"
              maxLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <div className="field">
            <label htmlFor="partner-forgot-confirm">Confirm password</label>
            <input
              id="partner-forgot-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="Repeat 6-digit password"
              maxLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        </>
      ) : null}
      {error ? <p className="admin-error">{error}</p> : null}
      <button type="submit" className="service-submit" disabled={busy}>
        {busy ? "Please wait…" : sent ? "Save password" : "Send OTP"}
      </button>
      <button
        type="button"
        className="partner-forgot-btn"
        onClick={() => {
          setError("");
          if (sent) {
            setSent(false);
            setInfo("");
            setOtp("");
            return;
          }
          onCancel?.();
        }}
      >
        {sent ? "Send a new OTP" : "Back to sign in"}
      </button>
    </form>
  );
}
