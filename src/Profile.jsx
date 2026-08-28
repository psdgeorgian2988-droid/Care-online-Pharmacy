import { useState } from "react";
import ReferFamily from "./ReferFamily";
import { POINT_VALUES, awardFamilyMemberPoints, useWallet } from "./pointsStore";
import AddressFields from "./AddressFields";
import PersonFields from "./PersonFields";
import FamilyMembersFields from "./FamilyMembersFields";
import {
  readUserProfile,
  validateAddress,
  withFormattedAddress,
} from "./addressFields";
import {
  pickFamilyMembers,
  pickPerson,
  validateFamilyMembers,
  validatePerson,
} from "./personFields";

const PROFILE_KEY = "mediHomeUser";

function readProfile() {
  return readUserProfile();
}

function Profile() {
  const wallet = useWallet();
  const [form, setForm] = useState(readProfile);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "familyMembers"
        ? value
        : name === "mobile" || name === "pinCode"
          ? String(value || "").replace(/\D/g, "")
          : value;

    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSaved(false);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      newErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(newErrors, validatePerson(form));
    Object.assign(newErrors, validateAddress(form));
    Object.assign(newErrors, validateFamilyMembers(form));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const profile = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      ...pickPerson(form),
      familyMembers: pickFamilyMembers(form),
      ...withFormattedAddress(form),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    const points = awardFamilyMemberPoints(profile.familyMembers);
    setForm(profile);
    setSaved(
      points.count
        ? `Profile saved. +${points.awarded} credit points for ${points.count} family member${points.count === 1 ? "" : "s"}.`
        : true
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <section className="profile-hero">
          <div>
            <span className="profile-label">MEDIHOME ACCOUNT</span>
            <h1>Your Profile</h1>
            <p>Save your details once for medicine and service bookings.</p>
          </div>
        </section>

        <form className="profile-form" onSubmit={handleSave}>
          <section className="profile-card" aria-label="Add family members">
            <FamilyMembersFields
              idPrefix="profile-family"
              members={form.familyMembers}
              errors={errors}
              onChange={handleChange}
            />
          </section>

          <section className="profile-card">
          <div className="profile-field">
            <label htmlFor="name">
              Full Name <span>*</span>
            </label>
            <input
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
            />
            {errors.name && <small className="profile-error">{errors.name}</small>}
          </div>

          <div className="profile-field">
            <label htmlFor="mobile">
              Mobile Number <span>*</span>
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              maxLength="10"
              placeholder="10-digit mobile number"
              value={form.mobile}
              onChange={handleChange}
            />
            {errors.mobile && (
              <small className="profile-error">{errors.mobile}</small>
            )}
          </div>

          <PersonFields
            idPrefix="profile"
            values={form}
            errors={errors}
            onChange={handleChange}
          />

          <AddressFields
            idPrefix="profile"
            values={form}
            errors={errors}
            onChange={handleChange}
          />

          {saved ? (
            <p className="profile-success">
              {typeof saved === "string"
                ? saved
                : "Profile saved. These details will auto-fill medicine checkout and laboratory/radiology bookings for yourself."}
            </p>
          ) : null}

          <button type="submit" className="profile-save-btn">
            Save Profile
          </button>
          </section>
        </form>

        <section className="profile-points-card">
          <h2>Your MediHome points</h2>
          <p>
            Webinar +{POINT_VALUES.webinar} · Quiz +{POINT_VALUES.quiz} · Family
            member +{POINT_VALUES.familyMember} · Referral uses {POINT_VALUES.referral}{" "}
            points for family and friends.
          </p>
          {wallet.ledger.length ? (
            <ul className="profile-ledger">
              {wallet.ledger.slice(0, 8).map((row) => (
                <li key={row.id}>
                  <strong>
                    {row.amount > 0 ? "+" : ""}
                    {row.amount}
                  </strong>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile-ledger-empty">
              No points yet. Earn them in{" "}
              <a href="#education">Health Education</a>.
            </p>
          )}
        </section>

        <div className="profile-refer-wrap">
          <ReferFamily />
        </div>
      </div>
    </>
  );
}

const styles = `
  .profile-page{min-height:auto;padding:28px 4% 40px;background:transparent;color:#17324d;box-sizing:border-box}
  .profile-hero{max-width:760px;margin:0 auto 14px;padding:16px 22px;border-radius:14px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8);display:flex;justify-content:space-between;align-items:center;gap:18px;box-shadow:0 3px 12px rgba(30,100,140,.07)}
  .profile-label{display:inline-block;margin-bottom:4px;font-size:10px;font-weight:800;letter-spacing:1.3px;color:#1686b8}
  .profile-hero h1{margin:0 0 4px;font-size:25px;color:#123b59}
  .profile-hero p{margin:0;color:#607589;font-size:13px;line-height:1.4}
  .profile-hero-icon{width:54px;height:54px;border-radius:50%;background:#fff;display:flex;justify-content:center;align-items:center;font-size:27px;box-shadow:0 3px 10px rgba(0,0,0,.07);flex-shrink:0}
  .profile-points-chip{flex-shrink:0;min-width:118px;padding:10px 12px;border-radius:12px;background:#1a6b7a;color:#fff;text-decoration:none;text-align:center}
  .profile-points-chip strong{display:block;font-size:22px;line-height:1.1}
  .profile-points-chip span{display:block;margin-top:4px;font-size:11px;font-weight:800}
  .profile-points-card,.profile-refer-wrap,.profile-form{max-width:760px;margin:0 auto 14px}
  .profile-form{display:grid;gap:14px}
  .profile-card{padding:18px;background:#fff;border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,.06);display:grid;gap:12px}
  .profile-points-card{padding:16px 18px;background:#fff;border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,.06)}
  .profile-points-card h2{margin:0 0 6px;font-size:18px;color:#123b59}
  .profile-points-card p{margin:0 0 10px;color:#607589;font-size:13px}
  .profile-ledger{margin:0;padding:0;list-style:none}
  .profile-ledger li{display:flex;gap:10px;padding:6px 0;border-top:1px solid #edf1f3;font-size:13px;color:#34546b}
  .profile-ledger strong{min-width:36px;color:#1a6b7a}
  .profile-ledger-empty a{color:#1a6b7a;font-weight:700;text-decoration:none}
  .profile-field{display:flex;flex-direction:column}
  .profile-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
  .profile-field label span{color:#e34d4d}
  .profile-field input,.profile-field select,.profile-field textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font-size:14px;outline:none;font-family:inherit;height:38px;min-height:38px}
  .profile-field textarea{height:auto;min-height:64px}
  .profile-field input:focus,.profile-field select:focus,.profile-field textarea:focus{border-color:#1a6b7a;box-shadow:none}
  .profile-error{margin-top:4px;color:#d84b4b;font-size:11px}
  .profile-success{margin:0;padding:10px 12px;border-radius:8px;background:#e5f8ee;color:#1c9b61;font-size:13px;font-weight:600}
  .profile-save-btn{border:none;border-radius:8px;padding:11px 16px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:800;cursor:pointer}
  @media (max-width:800px){.profile-page{padding:14px 10px}.profile-hero{padding:14px}.profile-hero-icon{display:none}}
`;

export default Profile;
