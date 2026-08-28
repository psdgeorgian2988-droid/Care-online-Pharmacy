import { useState } from "react";
import PersonFields from "./PersonFields";
import {
  PROFILE_KEY,
  useLoginSession,
  writeLoginSession,
} from "./authSession";
import { readUserProfile, withFormattedAddress } from "./addressFields";
import { pickFamilyMembers, pickPerson, validatePerson } from "./personFields";
import { missingGuestRegisterFields } from "./guestOrder";

function saveAccount(draft) {
  const existing = readUserProfile();
  const sameAccount = existing.mobile === draft.mobile;
  const profile = {
    name: draft.name.trim(),
    mobile: draft.mobile.trim(),
    ...pickPerson(draft),
    familyMembers: sameAccount ? pickFamilyMembers(existing) : [],
    ...withFormattedAddress({
      ...draft,
      addressConfirmed: "yes",
    }),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  writeLoginSession(profile);
}

export default function GuestCheckoutRegister({ details = {} }) {
  const user = useLoginSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => missingGuestRegisterFields(details).draft);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  if (user) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus("");
  };

  const startRegister = () => {
    const next = missingGuestRegisterFields(details);
    setForm(next.draft);
    setErrors({});
    const orderGaps = next.missing.filter(
      (key) => key === "name" || key === "mobile" || key === "address"
    );
    if (orderGaps.length) {
      setOpen(false);
      setStatus("Complete name, mobile and address above first.");
      return;
    }
    if (!next.missing.includes("gender") && !next.missing.includes("dob")) {
      saveAccount(next.draft);
      return;
    }
    setStatus("");
    setOpen(true);
  };

  const handleCreate = (event) => {
    event.preventDefault();
    const merged = { ...missingGuestRegisterFields(details).draft, ...form };
    const nextErrors = validatePerson(merged);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveAccount(merged);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="guest-order-reg">
        <p className="guest-order-title">
          Register for year-round discounts, offers and MediHome points.
        </p>
        {!open ? (
          <button type="button" className="guest-order-btn" onClick={startRegister}>
            Register
          </button>
        ) : (
          <form className="guest-order-form" onSubmit={handleCreate}>
            <PersonFields
              idPrefix="guest-order"
              values={form}
              errors={errors}
              onChange={handleChange}
            />
            <button type="submit" className="guest-order-btn">
              Create account
            </button>
          </form>
        )}
        {status ? <small className="guest-order-error">{status}</small> : null}
      </div>
    </>
  );
}

const styles = `
.guest-order-reg{margin:0 0 12px;padding:10px 12px;border:1px solid #c5e0d4;border-radius:10px;background:#f3fbf6;display:grid;gap:8px}
.guest-order-title{margin:0;font-size:13px;font-weight:800;color:#0f5c45;line-height:1.35}
.guest-order-form{display:grid;gap:8px}
.guest-order-btn{height:36px;max-width:180px;border:none;border-radius:8px;background:#1e8a73;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
.guest-order-error{color:#b64b4b;font-size:12px}
`;
