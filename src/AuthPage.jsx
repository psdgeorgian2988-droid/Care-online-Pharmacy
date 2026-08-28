import { useEffect, useState } from "react";
import AddressFields from "./AddressFields";
import PersonFields from "./PersonFields";
import FamilyMembersFields from "./FamilyMembersFields";
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
  validateFamilyMembers,
  validatePerson,
} from "./personFields";
import {
  PROFILE_KEY,
  consumeReturnHash,
  readLoginSession,
  writeLoginSession,
} from "./authSession";
import { goToHash } from "./hashRoute";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const [login, setLogin] = useState({ mobile: "", pinCode: "" });
  const [register, setRegister] = useState({
    name: "",
    mobile: "",
    ...emptyPerson(),
    familyMembers: [],
    ...emptyAddress(),
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });
  const editingAccount = isRegister && Boolean(readLoginSession());

  useEffect(() => {
    if (isRegister) return;
    if (readLoginSession()) goToHash("#home");
  }, [isRegister]);

  useEffect(() => {
    if (!isRegister) return;
    if (!readLoginSession()) return;
    const saved = readUserProfile();
    if (!saved.name && !saved.mobile) return;
    setRegister({
      name: saved.name || "",
      mobile: saved.mobile || "",
      ...emptyPerson(),
      ...pickPerson(saved),
      familyMembers: pickFamilyMembers(saved),
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
    if (name === "familyMembers") {
      setRegister((prev) => ({ ...prev, familyMembers: value }));
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith("familyMembers.")) delete next[key];
        });
        return next;
      });
      setStatus({ type: "", text: "" });
      return;
    }
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
    if (saved.mobile !== login.mobile || saved.pinCode !== login.pinCode) {
      setStatus({
        type: "error",
        text: "Mobile or PIN does not match your saved profile.",
      });
      return;
    }
    writeLoginSession(saved);
    goToHash(consumeReturnHash());
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!register.name.trim()) nextErrors.name = "Full name is required.";
    if (!/^[6-9]\d{9}$/.test(register.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(nextErrors, validatePerson(register));
    Object.assign(nextErrors, validateAddress(register));
    Object.assign(nextErrors, validateFamilyMembers(register));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const profile = {
      name: register.name.trim(),
      mobile: register.mobile.trim(),
      ...pickPerson(register),
      familyMembers: pickFamilyMembers(register),
      ...withFormattedAddress(register),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    writeLoginSession(profile);
    goToHash(editingAccount ? "#profile" : consumeReturnHash());
  };

  return (
    <>
      <style>{styles}</style>
      <div className={`auth-page${isRegister ? " is-register" : " is-login"}`}>
        <section className="auth-card">
          <h1>{editingAccount ? "Edit Account" : isRegister ? "Create Account" : "Login"}</h1>

          {isRegister ? (
            <form className="auth-form" onSubmit={handleRegister} autoComplete="off">
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
              <FamilyMembersFields
                idPrefix="auth-family"
                members={register.familyMembers}
                errors={errors}
                accountMobile={register.mobile}
                onChange={handleRegisterChange}
              />
              <button type="submit">
                {editingAccount ? "Save Changes" : "Create account"}
              </button>
            </form>
          ) : (
            <form className="auth-form auth-form-login" onSubmit={handleLogin} autoComplete="off">
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
              <button type="submit">Login</button>
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
            ) : (
              <>
                New here? <a href="#register">Create account</a>
              </>
            )}
          </p>
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
.auth-form .person-fields,.auth-form .addr-fields,.auth-form .family-fields,.auth-form button[type=submit]{grid-column:1/-1}
.auth-form button[type=submit]{margin-top:6px;height:40px;max-width:220px;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:800;cursor:pointer}
.auth-form-login button[type=submit]{max-width:none}
.auth-error{margin-top:4px;color:#d84b4b;font-size:11px}
.auth-status{margin:10px 0 0;font-size:12px;font-weight:600}
.auth-status.error{color:#d84b4b}
.auth-status.success{color:#1c9b61}
.auth-switch{margin:14px 0 0;color:#5d7180;font-size:13px}
.auth-switch a{color:#1a6b7a;font-weight:800;text-decoration:none}
@media (max-width:800px){
  .auth-page{padding:14px 10px 24px}
  .auth-form{grid-template-columns:1fr}
  .auth-form button[type=submit]{max-width:none}
}
`;
