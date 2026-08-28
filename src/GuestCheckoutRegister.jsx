import { useEffect, useState } from "react";
import PersonFields from "./PersonFields";
import {
  PROFILE_KEY,
  useLoginSession,
  writeLoginSession,
} from "./authSession";
import { readUserProfile, withFormattedAddress } from "./addressFields";
import { pickFamilyMembers, pickPerson, pickEmail, validatePerson, validateEmail, accountCreatorMobile } from "./personFields";
import { normalizeLoginPin, pickLoginPin } from "./loginPin";
import { noContactEmailProps } from "./noContactAutofill";
import {
  GUEST_REGISTER_BENEFITS,
  GUEST_REGISTER_HEADLINE,
  guestRegisterPlan,
} from "./guestOrder";

function saveAccount(draft) {
  const existing = readUserProfile();
  const sameAccount = existing.mobile === draft.mobile;
  const creatorMobile = accountCreatorMobile(draft, existing);
  const profile = {
    name: draft.name.trim(),
    mobile: creatorMobile,
    creatorMobile,
    email: pickEmail(draft),
    loginPin: pickLoginPin(draft, existing) || normalizeLoginPin(draft.pinCode),
    ...pickPerson(draft),
    familyMembers: sameAccount
      ? pickFamilyMembers({ ...existing, mobile: creatorMobile, creatorMobile })
      : [],
    ...withFormattedAddress({
      ...draft,
      addressConfirmed: "yes",
    }),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  writeLoginSession(profile);
}

export default function GuestCheckoutRegister({
  details = {},
  open = false,
  onSkip,
  onRegistered,
  onNeedContact,
}) {
  const user = useLoginSession();
  const [step, setStep] = useState("prompt");
  const [form, setForm] = useState(() => guestRegisterPlan(details).draft);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const plan = guestRegisterPlan(details);
    setStep("prompt");
    setForm(plan.draft);
    setErrors({});
    setStatus("");
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
  }, [open]);

  if (user || !open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus("");
  };

  const startRegister = () => {
    const plan = guestRegisterPlan({ ...details, ...form });
    setForm(plan.draft);
    setErrors({});
    if (plan.needsOrderContact) {
      onNeedContact?.();
      return;
    }
    if (plan.canSaveNow) {
      saveAccount(plan.draft);
      onRegistered?.();
      return;
    }
    setStatus("");
    setStep("register");
  };

  const handleCreate = (event) => {
    event.preventDefault();
    const plan = guestRegisterPlan(details);
    const merged = { ...plan.draft, ...form };
    if (plan.needsOrderContact) {
      onNeedContact?.();
      return;
    }
    const nextErrors = {
      ...validatePerson(merged),
      ...validateEmail(merged),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveAccount(merged);
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
          {step === "prompt" ? (
            <>
              <p id="guest-pay-title" className="guest-pay-headline">
                {GUEST_REGISTER_HEADLINE}
              </p>
              <div className="guest-pay-actions">
                <button type="button" className="guest-pay-btn" onClick={() => setStep("benefits")}>
                  Know More
                </button>
                <button type="button" className="guest-pay-btn is-ghost" onClick={onSkip}>
                  Not Now
                </button>
              </div>
            </>
          ) : null}

          {step === "benefits" ? (
            <>
              <p className="guest-pay-kicker">MediHome Members</p>
              <h2 id="guest-pay-title">Member Benefits</h2>
              <ul className="guest-pay-benefits">
                {GUEST_REGISTER_BENEFITS.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
              <div className="guest-pay-actions">
                <button type="button" className="guest-pay-btn" onClick={startRegister}>
                  Register
                </button>
                <button type="button" className="guest-pay-btn is-ghost" onClick={onSkip}>
                  Not Now
                </button>
              </div>
            </>
          ) : null}

          {step === "register" ? (
            <div className="guest-pay-form">
              <p className="guest-pay-kicker">MediHome Members</p>
              <h2 id="guest-pay-title">Create Account</h2>
              <p className="guest-pay-reuse">
                Name, mobile and address from this order will be saved to your
                account. Add your mail ID to finish.
              </p>
              <label className="guest-pay-mail">
                Mail ID
                <input
                  name="email"
                  placeholder="name@email.com"
                  value={form.email || ""}
                  onChange={handleChange}
                  {...noContactEmailProps}
                />
                {errors.email ? (
                  <small className="guest-pay-error">{errors.email}</small>
                ) : null}
              </label>
              <PersonFields
                idPrefix="guest-order"
                values={form}
                errors={errors}
                onChange={handleChange}
              />
              {status ? <small className="guest-pay-error">{status}</small> : null}
              <div className="guest-pay-actions">
                <button type="button" className="guest-pay-btn" onClick={handleCreate}>
                  Create Account
                </button>
                <button type="button" className="guest-pay-btn is-ghost" onClick={onSkip}>
                  Not Now
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

const styles = `
.guest-pay-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,50,70,.5)}
.guest-pay-dialog{width:min(440px,100%);padding:22px 20px 18px;border-radius:14px;background:#fff;border:1px solid #e4ecef;box-shadow:0 18px 48px rgba(20,50,70,.28);color:#143246}
.guest-pay-headline{margin:0 0 16px;font-size:20px;font-weight:800;line-height:1.35;color:#0f5c45;text-align:center}
.guest-pay-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#1a6b7a}
.guest-pay-dialog h2{margin:0 0 10px;font-size:20px;font-weight:800;color:#143246}
.guest-pay-benefits{margin:0 0 16px;padding:0 0 0 18px;display:grid;gap:8px;color:#143246;font-size:14px;font-weight:700;line-height:1.4}
.guest-pay-reuse{margin:0 0 12px;font-size:13px;font-weight:700;color:#34546b;line-height:1.4}
.guest-pay-mail{display:grid;gap:4px;font-size:12px;font-weight:700;color:#1a6b7a}
.guest-pay-mail input{height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;font-weight:500;color:#143246}
.guest-pay-form{display:grid;gap:8px}
.guest-pay-actions{display:flex;flex-wrap:wrap;gap:8px}
.guest-pay-btn{flex:1;min-height:42px;border:none;border-radius:8px;background:#1e8a73;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.guest-pay-btn.is-ghost{background:#fff;color:#1a6b7a;border:1px solid #d7e2e9}
.guest-pay-error{color:#b64b4b;font-size:12px}
`;
