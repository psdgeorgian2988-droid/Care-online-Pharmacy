import { useEffect, useState } from "react";
import AddressFields from "./AddressFields";
import PersonFields from "./PersonFields";
import {
  emptyAddress,
  pickAddress,
  readUserProfile,
  validateAddress,
  withFormattedAddress,
} from "./addressFields";
import {
  emptyPerson,
  pickFamilyMembers,
  pickPerson,
  validatePerson,
  accountCreatorMobile,
  pickEmail,
  validateEmail,
} from "./personFields";
import {
  PROFILE_KEY,
  consumeReturnHash,
  readLoginSession,
  writeLoginSession,
} from "./authSession";
import { goToHash } from "./hashRoute";
import AutofillTrap from "./AutofillTrap";
import { noContactEmailProps, noContactMobileProps, noContactNameProps } from "./noContactAutofill";
import {
  MEMBER_ROLE,
  findAccountActor,
  holderActor,
} from "./familyAccount";
import { normalizeLoginPin, pickLoginPin, profileLoginPin } from "./loginPin";
import {
  confirmResetOtp,
  lookupResetAccount,
  resetOtpChannels,
  saveResetLoginPin,
  sendResetOtp,
} from "./forgotPin";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function readForgotMobile() {
  try {
    const value = sessionStorage.getItem("mediHomeForgotMobile") || "";
    sessionStorage.removeItem("mediHomeForgotMobile");
    return digitsOnly(value).slice(0, 10);
  } catch {
    return "";
  }
}

export default function AuthPage({ mode = "login" }) {
  if (mode === "forgot") return <ForgotPinPage />;
  return <LoginRegisterPage mode={mode} />;
}

function LoginRegisterPage({ mode }) {
  const isRegister = mode === "register";
  const [login, setLogin] = useState({ mobile: "", pinCode: "" });
  const [register, setRegister] = useState({
    name: "",
    mobile: "",
    email: "",
    ...emptyPerson(),
    ...emptyAddress(),
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });
  const session = readLoginSession();
  const editingAccount = isRegister && Boolean(session);
  const holderEditing =
    editingAccount && session?.accountRole !== MEMBER_ROLE;

  useEffect(() => {
    if (isRegister) return;
    if (readLoginSession()) goToHash("#home");
  }, [isRegister]);

  useEffect(() => {
    if (!isRegister) return;
    const current = readLoginSession();
    if (!current) return;
    if (current.accountRole === MEMBER_ROLE) {
      goToHash("#profile");
      return;
    }
    const saved = readUserProfile();
    if (!saved.name && !saved.mobile) return;
    setRegister({
      name: saved.name || "",
      mobile: saved.creatorMobile || saved.mobile || "",
      creatorMobile: saved.creatorMobile || saved.mobile || "",
      email: saved.email || "",
      ...emptyPerson(),
      ...pickPerson(saved),
      ...emptyAddress(),
      ...pickAddress(saved),
    });
  }, [isRegister]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLogin((prev) => ({ ...prev, [name]: digitsOnly(value) }));
    setStatus({ type: "", text: "" });
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "mobile" || name === "pinCode" ? digitsOnly(value) : value;
    setRegister((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus({ type: "", text: "" });
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const saved = readUserProfile();
    if (!/^[6-9]\d{9}$/.test(login.mobile)) {
      setStatus({ type: "error", text: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!/^\d{6}$/.test(login.pinCode)) {
      setStatus({ type: "error", text: "Enter your 6-digit PIN." });
      return;
    }
    if (!saved.mobile) {
      setStatus({ type: "error", text: "No account found. Please register first." });
      return;
    }
    const actor = findAccountActor(saved, login.mobile);
    if (!actor || profileLoginPin(saved) !== login.pinCode) {
      setStatus({
        type: "error",
        text: "Mobile or PIN does not match your saved profile.",
      });
      return;
    }
    writeLoginSession(saved, actor);
    goToHash(actor.role === MEMBER_ROLE ? "#profile" : consumeReturnHash());
  };

  const openForgot = () => {
    try {
      if (login.mobile) sessionStorage.setItem("mediHomeForgotMobile", login.mobile);
    } catch {
      /* ignore */
    }
    goToHash("#forgot");
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!register.name.trim()) nextErrors.name = "Full name is required.";
    if (!/^[6-9]\d{9}$/.test(register.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(nextErrors, validateEmail(register));
    Object.assign(nextErrors, validatePerson(register));
    Object.assign(
      nextErrors,
      validateAddress(
        holderEditing ? { ...register, addressConfirmed: "yes" } : register
      )
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const previous = readUserProfile();
    const creatorMobile = accountCreatorMobile(register, previous);
    const sameAccount = Boolean(previous.mobile) && previous.mobile === creatorMobile;
    const profile = {
      name: register.name.trim(),
      mobile: creatorMobile,
      creatorMobile,
      email: pickEmail(register),
      loginPin: pickLoginPin(register, previous) || normalizeLoginPin(register.pinCode),
      ...pickPerson(register),
      familyMembers: sameAccount
        ? pickFamilyMembers({ ...previous, mobile: creatorMobile, creatorMobile })
        : [],
      ...withFormattedAddress({ ...register, addressConfirmed: "yes" }),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    writeLoginSession(profile, holderActor(profile));
    const next = editingAccount ? "#profile" : consumeReturnHash();
    goToHash(next === "#home" ? "#profile" : next);
  };

  return (
    <>
      <style>{styles}</style>
      <div className={`auth-page${isRegister ? " is-register" : " is-login"}`}>
        <section className="auth-card">
          <h1>{editingAccount ? "Edit Account" : isRegister ? "Create Account" : "Login"}</h1>

          {isRegister ? (
            <form className="auth-form" onSubmit={handleRegister} autoComplete="off">
              <AutofillTrap />
              <div className="auth-field">
                <label htmlFor="auth-register-name">
                  Full name <span>*</span>
                </label>
                <input
                  id="auth-register-name"
                  name="name"
                  placeholder="Your full name"
                  value={register.name}
                  onChange={handleRegisterChange}
                  {...noContactNameProps}
                />
                {errors.name ? <small className="auth-error">{errors.name}</small> : null}
              </div>
              <div className="auth-field">
                <label htmlFor="auth-register-mobile">
                  Mobile number <span>*</span>
                </label>
                <input
                  id="auth-register-mobile"
                  name="mobile"
                  maxLength="10"
                  placeholder="10-digit mobile"
                  value={register.mobile}
                  onChange={handleRegisterChange}
                  {...noContactMobileProps}
                />
                {errors.mobile ? (
                  <small className="auth-error">{errors.mobile}</small>
                ) : null}
              </div>
              <div className="auth-field">
                <label htmlFor="auth-register-email">
                  Mail ID <span>*</span>
                </label>
                <input
                  id="auth-register-email"
                  name="email"
                  placeholder="name@email.com"
                  value={register.email}
                  onChange={handleRegisterChange}
                  {...noContactEmailProps}
                />
                {errors.email ? (
                  <small className="auth-error">{errors.email}</small>
                ) : null}
              </div>
              <PersonFields
                idPrefix="auth-register"
                values={register}
                errors={errors}
                onChange={handleRegisterChange}
              />
              <AddressFields
                idPrefix="auth-register"
                values={register}
                errors={errors}
                onChange={handleRegisterChange}
              />
              {editingAccount ? null : (
                <p className="auth-hint">
                  After you create this account and log in, add family members
                  from Profile.
                </p>
              )}
              <button type="submit">
                {editingAccount ? "Save Changes" : "Create account"}
              </button>
            </form>
          ) : (
            <form className="auth-form auth-form-login" onSubmit={handleLogin} autoComplete="off">
              <AutofillTrap />
              <div className="auth-field">
                <label htmlFor="auth-login-mobile">
                  Mobile number <span>*</span>
                </label>
                <input
                  id="auth-login-mobile"
                  name="mobile"
                  maxLength="10"
                  placeholder="10-digit mobile"
                  value={login.mobile}
                  onChange={handleLoginChange}
                  {...noContactMobileProps}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="auth-login-pin">
                  PIN <span>*</span>
                </label>
                <input
                  id="auth-login-pin"
                  name="pinCode"
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="6-digit PIN"
                  value={login.pinCode}
                  onChange={handleLoginChange}
                />
              </div>
              <div className="auth-login-actions">
                <button type="submit">Login</button>
                <a className="auth-register-btn" href="#register">
                  Register
                </a>
              </div>
              <button type="button" className="auth-forgot-btn" onClick={openForgot}>
                Forgot PIN?
              </button>
            </form>
          )}

          {status.text ? (
            <p className={`auth-status ${status.type}`}>{status.text}</p>
          ) : null}

          <p className="auth-switch">
            {editingAccount ? (
              <>
                Need the points page? <a href="#profile">Open Profile</a>
              </>
            ) : isRegister ? (
              <>
                Already registered? <a href="#login">Login</a>
              </>
            ) : null}
          </p>
        </section>
      </div>
    </>
  );
}

function ForgotPinPage() {
  const [step, setStep] = useState("find");
  const [lookup, setLookup] = useState(() => ({
    mobile: readForgotMobile(),
    email: "",
  }));
  const [account, setAccount] = useState(null);
  const [channels, setChannels] = useState(["mobile", "email"]);
  const [sent, setSent] = useState(null);
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState({ next: "", confirm: "" });
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (readLoginSession()) goToHash("#home");
  }, []);

  const available = account ? resetOtpChannels(account.profile, account.actor) : [];
  const hasChannel = (id) => available.some((row) => row.id === id);

  const handleLookupChange = (event) => {
    const { name, value } = event.target;
    setLookup((prev) => ({
      ...prev,
      [name]: name === "mobile" ? digitsOnly(value).slice(0, 10) : value,
    }));
    setStatus({ type: "", text: "" });
  };

  const findAccount = (event) => {
    event.preventDefault();
    const found = lookupResetAccount(lookup);
    if (!found.ok) {
      setStatus({ type: "error", text: found.error });
      return;
    }
    const nextChannels = resetOtpChannels(found.profile, found.actor).map(
      (row) => row.id
    );
    setAccount({ profile: found.profile, actor: found.actor });
    setChannels(nextChannels);
    setSent(null);
    setOtp("");
    setStatus({ type: "", text: "" });
    setStep("otp");
  };

  const toggleChannel = (id) => {
    if (!hasChannel(id)) return;
    setChannels((prev) => {
      const on = prev.includes(id);
      if (on && prev.length === 1) return prev;
      return on ? prev.filter((row) => row !== id) : [...prev, id];
    });
    setStatus({ type: "", text: "" });
  };

  const sendOtp = () => {
    const result = sendResetOtp({
      profile: account.profile,
      actor: account.actor,
      channels,
    });
    if (!result.ok) {
      setStatus({ type: "error", text: result.error });
      return;
    }
    setSent(result);
    setOtp("");
    setStatus({ type: "", text: "" });
  };

  const verifyOtp = (event) => {
    event.preventDefault();
    const result = confirmResetOtp(otp);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error });
      return;
    }
    setStatus({ type: "", text: "" });
    setStep("pin");
  };

  const savePin = (event) => {
    event.preventDefault();
    const result = saveResetLoginPin(pin.next, pin.confirm);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error });
      return;
    }
    setStatus({ type: "", text: "" });
    setStep("done");
  };

  const sentLabels = (sent?.channels || [])
    .map((id) => available.find((row) => row.id === id)?.masked || id)
    .filter(Boolean);

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page is-login">
        <section className="auth-card">
          <h1>Forgot PIN</h1>
          <p className="auth-hint">
            Reset your login PIN with a one-time code on mobile or email. Your
            delivery PIN code stays the same.
          </p>

          {step === "find" ? (
            <form className="auth-form auth-form-login" onSubmit={findAccount} autoComplete="off">
              <AutofillTrap />
              <div className="auth-field">
                <label htmlFor="auth-forgot-mobile">Mobile number</label>
                <input
                  id="auth-forgot-mobile"
                  name="mobile"
                  maxLength="10"
                  placeholder="10-digit mobile"
                  value={lookup.mobile}
                  onChange={handleLookupChange}
                  {...noContactMobileProps}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="auth-forgot-email">Mail ID</label>
                <input
                  id="auth-forgot-email"
                  name="email"
                  placeholder="name@email.com"
                  value={lookup.email}
                  onChange={handleLookupChange}
                  {...noContactEmailProps}
                />
              </div>
              <button type="submit">Find Account</button>
            </form>
          ) : null}

          {step === "otp" ? (
            <div className="auth-form auth-form-login">
              <p className="auth-hint">Send the OTP to mobile, email, or both.</p>
              <div className="auth-channel" role="group" aria-label="OTP channels">
                {available.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={channels.includes(row.id) ? "is-on" : undefined}
                    aria-pressed={channels.includes(row.id)}
                    onClick={() => toggleChannel(row.id)}
                  >
                    {row.id === "mobile" ? "Mobile OTP" : "Email OTP"}
                    <small>{row.masked}</small>
                  </button>
                ))}
              </div>
              {!hasChannel("email") ? (
                <p className="auth-hint">
                  Add a mail ID on Profile to use email OTP.
                </p>
              ) : null}
              <div className="auth-login-actions">
                <button type="button" onClick={sendOtp}>
                  {sent ? "Resend OTP" : "Send OTP"}
                </button>
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={() => {
                    setStep("find");
                    setSent(null);
                    setOtp("");
                    setStatus({ type: "", text: "" });
                  }}
                >
                  Back
                </button>
              </div>
              {sent ? (
                <form className="auth-otp-form" onSubmit={verifyOtp} autoComplete="off">
                  <p className="auth-otp-demo">
                    OTP sent to {sentLabels.join(" and ")}.
                  </p>
                  <label htmlFor="auth-forgot-otp">
                    Enter OTP <span>*</span>
                  </label>
                  <input
                    id="auth-forgot-otp"
                    maxLength="4"
                    placeholder="4-digit OTP"
                    value={otp}
                    onChange={(event) =>
                      setOtp(digitsOnly(event.target.value).slice(0, 4))
                    }
                    {...noContactMobileProps}
                  />
                  <button type="submit">Verify OTP</button>
                </form>
              ) : null}
            </div>
          ) : null}

          {step === "pin" ? (
            <form className="auth-form auth-form-login" onSubmit={savePin} autoComplete="off">
              <div className="auth-field">
                <label htmlFor="auth-forgot-pin">
                  New PIN <span>*</span>
                </label>
                <input
                  id="auth-forgot-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="6-digit PIN"
                  value={pin.next}
                  onChange={(event) =>
                    setPin((prev) => ({
                      ...prev,
                      next: digitsOnly(event.target.value).slice(0, 6),
                    }))
                  }
                />
              </div>
              <div className="auth-field">
                <label htmlFor="auth-forgot-pin-confirm">
                  Confirm PIN <span>*</span>
                </label>
                <input
                  id="auth-forgot-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Re-enter PIN"
                  value={pin.confirm}
                  onChange={(event) =>
                    setPin((prev) => ({
                      ...prev,
                      confirm: digitsOnly(event.target.value).slice(0, 6),
                    }))
                  }
                />
              </div>
              <button type="submit">Save New PIN</button>
            </form>
          ) : null}

          {step === "done" ? (
            <div className="auth-form auth-form-login">
              <p className="auth-status success">
                PIN updated. Login with your new PIN.
              </p>
              <a className="auth-register-btn" href="#login">
                Login
              </a>
            </div>
          ) : null}

          {status.text ? (
            <p className={`auth-status ${status.type}`}>{status.text}</p>
          ) : null}

          {step === "done" ? null : (
            <p className="auth-switch">
              Remembered your PIN? <a href="#login">Login</a>
            </p>
          )}
        </section>
      </div>
    </>
  );
}

const styles = `
.auth-page{min-height:auto;padding:22px 4% 36px;background:transparent;color:#17324d;box-sizing:border-box}
.auth-card{max-width:860px;margin:0 auto;padding:20px 22px 22px;background:#fff;border-radius:16px;box-shadow:0 3px 14px rgba(30,100,140,.07)}
.auth-page.is-login .auth-card{max-width:420px}
.auth-card h1{margin:0 0 16px;font-size:24px;color:#123b59}
.auth-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 14px;align-items:start}
.auth-form-login{grid-template-columns:1fr}
.auth-field{display:flex;flex-direction:column;min-width:0}
.auth-form label{margin:0 0 5px;color:#34546b;font-size:12px;font-weight:700}
.auth-form label span{color:#e34d4d}
.auth-form input:not([type=radio]):not([type=checkbox]),
.auth-form select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px;outline:none}
.auth-form textarea{width:100%;box-sizing:border-box;height:auto;min-height:64px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px;outline:none;resize:vertical}
.auth-form input:focus,.auth-form select:focus,.auth-form textarea:focus{border-color:#1a6b7a}
.auth-form .person-fields,.auth-form .addr-fields,.auth-form .auth-hint,.auth-form .auth-login-actions,.auth-form .auth-forgot-btn,.auth-form .auth-channel,.auth-form .auth-otp-form,.auth-form > button[type=submit],.auth-form > .auth-register-btn{grid-column:1/-1}
.auth-hint{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.auth-form button[type=submit]{margin-top:6px;height:40px;max-width:220px;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:800;cursor:pointer}
.auth-login-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
.auth-login-actions button[type=submit],.auth-login-actions button[type=button],.auth-login-actions .auth-register-btn,.auth-form > .auth-register-btn{margin:0;max-width:none;width:100%;height:40px;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:800;cursor:pointer}
.auth-login-actions .auth-register-btn,.auth-form > .auth-register-btn{display:flex;align-items:center;justify-content:center;box-sizing:border-box;text-decoration:none}
.auth-login-actions button.auth-secondary-btn{background:#fff;color:#1a6b7a;border:1px solid #d7e2e9}
.auth-forgot-btn{margin-top:4px;height:36px;border:none;background:transparent;color:#1a6b7a;font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.auth-channel{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.auth-channel button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin:0;padding:10px 12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;color:#143246;font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-align:left}
.auth-channel button small{font-size:11px;font-weight:600;color:#5d7180}
.auth-channel button.is-on{border-color:#1a6b7a;background:#eef7f8;color:#1a6b7a}
.auth-otp-form{display:grid;gap:8px}
.auth-otp-form input{width:100%;box-sizing:border-box;height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.auth-otp-form button{margin:0;height:40px;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:800;cursor:pointer}
.auth-otp-demo{margin:0;color:#1a6b7a;font-size:13px;font-weight:700;line-height:1.4}
.auth-error{margin-top:4px;color:#d84b4b;font-size:11px}
.auth-status{margin:10px 0 0;font-size:12px;font-weight:600}
.auth-status.error{color:#d84b4b}
.auth-status.success{color:#1c9b61}
.auth-switch{margin:14px 0 0;color:#5d7180;font-size:13px}
.auth-switch a{color:#1a6b7a;font-weight:800;text-decoration:none}
.auth-switch:empty{display:none}
.auth-card > .auth-hint{margin:-4px 0 14px}
.auth-page.is-login .auth-form button[type=submit],.auth-page.is-login .auth-form > .auth-register-btn{max-width:none}
@media (max-width:800px){
  .auth-page{padding:14px 10px 24px}
  .auth-form{grid-template-columns:1fr}
  .auth-form button[type=submit]{max-width:none}
  .auth-channel{grid-template-columns:1fr}
}
`;
