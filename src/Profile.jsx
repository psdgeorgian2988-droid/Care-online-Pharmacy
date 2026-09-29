import { useEffect, useRef, useState } from "react";
import ReferFamily from "./ReferFamily";
import { awardFamilyMemberPoints, useWallet } from "./pointsStore";
import { pointsRedeemPanel, setRedeemIntent } from "./walletQuote";
import { goBackHash, goToHash, parseAppHash } from "./hashRoute";
import { readTestCart } from "./medicineCartStore";
import AddressFields from "./AddressFields.jsx";
import PersonFields from "./PersonFields.jsx";
import FamilyMembersFields from "./FamilyMembersFields";
import FamilyTree from "./FamilyTree";
import {
  readUserProfile,
  validateAddress,
  withFormattedAddress,
} from "./addressFields";
import {
  accountCreatorMobile,
  genderLabel,
  pickFamilyMembers,
  pickPerson,
  relationLabel,
  validateFamilyMembers,
  validatePerson,
  maskMobile,
  pickEmail,
  validateEmail,
} from "./personFields";
import { noContactEmailProps, noContactMobileProps, noContactNameProps } from "./noContactAutofill";
import AutofillTrap from "./AutofillTrap";
import { PROFILE_KEY, useLoginSession, writeLoginSession } from "./authSession";
import { MEMBER_ROLE, holderActor } from "./familyAccount";
import { pickLoginPin } from "./loginPin";

function readProfile() {
  return readUserProfile();
}

function Profile() {
  const wallet = useWallet();
  const session = useLoginSession();
  const holderView = session?.accountRole !== MEMBER_ROLE;
  const [form, setForm] = useState(readProfile);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [memberFormTick, setMemberFormTick] = useState(0);
  const [pointsOpen, setPointsOpen] = useState(
    () => parseAppHash(typeof window !== "undefined" ? window.location.hash : "").service === "points"
  );
  const pointsWrapRef = useRef(null);

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
    if (!/^[6-9]\d{9}$/.test(accountCreatorMobile(form))) {
      newErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(newErrors, validateEmail(form));
    Object.assign(newErrors, validatePerson(form));
    Object.assign(
      newErrors,
      validateAddress(editDetails ? form : { ...form, addressConfirmed: "yes" })
    );
    Object.assign(newErrors, validateFamilyMembers(form));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const previous = readUserProfile();
    const creatorMobile = accountCreatorMobile(form, previous);
    const profile = {
      name: form.name.trim(),
      mobile: creatorMobile,
      creatorMobile,
      email: pickEmail(form),
      loginPin: pickLoginPin(form, previous),
      ...pickPerson(form),
      familyMembers: pickFamilyMembers({
        ...form,
        mobile: creatorMobile,
        creatorMobile,
      }).filter((member) => member.name),
      ...withFormattedAddress({ ...form, addressConfirmed: "yes" }),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    writeLoginSession(profile, holderActor(profile));
    const points = awardFamilyMemberPoints(profile.familyMembers);
    setForm(profile);
    setEditDetails(false);
    setMemberFormTick((tick) => tick + 1);
    setSaved(
      points.count
        ? `Profile saved. +${points.awarded} credit points for ${points.count} family member${points.count === 1 ? "" : "s"}.`
        : true
    );
  };

  const pointsPanel = pointsRedeemPanel(wallet.balance);
  const startRedeem = () => {
    if (!pointsPanel.canRedeem) return;
    setRedeemIntent(true);
    setPointsOpen(false);
    goToHash(readTestCart().length ? "#checkout" : "#labs");
  };

  useEffect(() => {
    const syncPoints = () => {
      setPointsOpen(parseAppHash(window.location.hash).service === "points");
    };
    window.addEventListener("hashchange", syncPoints);
    return () => window.removeEventListener("hashchange", syncPoints);
  }, []);

  useEffect(() => {
    if (!pointsOpen) return undefined;
    const closePoints = () => {
      if (parseAppHash(window.location.hash).service === "points") {
        goBackHash();
        return;
      }
      setPointsOpen(false);
    };
    const onDoc = (event) => {
      if (!pointsWrapRef.current?.contains(event.target)) closePoints();
    };
    const onKey = (event) => {
      if (event.key === "Escape") closePoints();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pointsOpen]);

  if (!holderView && session) {
    return (
      <>
        <style>{styles}</style>
        <div className="profile-page">
          <section className="profile-hero">
            <div>
              <span className="profile-label">MEDIHOME ACCOUNT</span>
              <h1>{session.name || "Your Details"}</h1>
              <p>Only your details from this family account are shown.</p>
            </div>
          </section>
          <section className="profile-card" aria-label="Your details">
            <dl className="profile-member-details">
              <div>
                <dt>Name</dt>
                <dd>{session.name || "—"}</dd>
              </div>
              <div>
                <dt>Relation</dt>
                <dd>{relationLabel(session.accountRelation) || "Family Member"}</dd>
              </div>
              <div>
                <dt>Male / Female</dt>
                <dd>{genderLabel(session.gender) || "—"}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{session.age ? `${session.age} years` : "—"}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{maskMobile(session.mobile) || "—"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <section className="profile-hero">
          <div className="profile-hero-copy">
            <span className="profile-label">MEDIHOME ACCOUNT</span>
            <h1>{form.name || "Your Family"}</h1>
          </div>
          <div className="profile-points-wrap" ref={pointsWrapRef}>
            <button
              type="button"
              className="profile-points-tab"
              aria-label="Your MediHome points"
              aria-expanded={pointsOpen}
              aria-haspopup="dialog"
              onClick={() => {
                if (pointsOpen) {
                  if (parseAppHash(window.location.hash).service === "points") {
                    goBackHash();
                    return;
                  }
                  setPointsOpen(false);
                  return;
                }
                goToHash("#profile?service=points");
              }}
            >
              <span className="profile-points-tab-label">MediHome points</span>
              <strong className="profile-points-tab-value">
                {pointsPanel.balance.toLocaleString("en-IN")}
              </strong>
            </button>
            {pointsOpen && pointsPanel.canRedeem ? (
              <div className="profile-points-pop" role="dialog" aria-label="Redeem points">
                <p className="profile-points-pop-title">Redeem points</p>
                <button type="button" className="profile-redeem-btn" onClick={startRedeem}>
                  Redeem ₹{pointsPanel.rupees}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="profile-card" aria-label="Family tree">
          <FamilyTree profile={form} />
        </section>

        <form className="profile-form" onSubmit={handleSave} autoComplete="off">
          <AutofillTrap />
          <section className="profile-card" aria-label="Add family members">
            <FamilyMembersFields
              idPrefix="profile-family"
              members={form.familyMembers}
              errors={errors}
              accountMobile={accountCreatorMobile(form)}
              savedAs="summary"
              collapseTick={memberFormTick}
              onChange={handleChange}
            />
          </section>

          {editDetails ? (
            <section className="profile-card">
              <div className="profile-field">
                <label htmlFor="profile-account-name">
                  Full Name <span>*</span>
                </label>
                <input
                  id="profile-account-name"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  {...noContactNameProps}
                />
                {errors.name && <small className="profile-error">{errors.name}</small>}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-account-mobile">
                  Account Mobile <span>*</span>
                </label>
                <input
                  id="profile-account-mobile"
                  name="mobile"
                  maxLength="10"
                  placeholder="10-digit mobile number"
                  value={maskMobile(accountCreatorMobile(form)) || accountCreatorMobile(form)}
                  readOnly
                  {...noContactMobileProps}
                />
                <small className="profile-hint">
                  This is the mobile used when the account was created. Family
                  members without their own number use it.
                </small>
              </div>

              <div className="profile-field">
                <label htmlFor="profile-account-email">
                  Mail ID <span>*</span>
                </label>
                <input
                  id="profile-account-email"
                  name="email"
                  placeholder="name@email.com"
                  value={form.email || ""}
                  onChange={handleChange}
                  {...noContactEmailProps}
                />
                {errors.email && <small className="profile-error">{errors.email}</small>}
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
            </section>
          ) : null}

          {saved ? (
            <p className="profile-success">
              {typeof saved === "string"
                ? saved
                : "Profile saved. These details will auto-fill medicine checkout and laboratory/radiology bookings for yourself."}
            </p>
          ) : null}

          <div className="profile-actions">
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => setEditDetails((on) => !on)}
            >
              {editDetails ? "Hide Account Details" : "Edit Account Details"}
            </button>
            <button type="submit" className="profile-save-btn">
              Save Profile
            </button>
          </div>
        </form>

        <div className="profile-refer-wrap">
          <ReferFamily />
        </div>
      </div>
    </>
  );
}

const styles = `
  .profile-page{min-height:auto;padding:28px 4% 40px;background:transparent;color:#17324d;box-sizing:border-box}
  .profile-hero{max-width:760px;margin:0 auto 14px;padding:16px 22px;border-radius:14px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:nowrap;box-shadow:0 3px 12px rgba(30,100,140,.07)}
  .profile-hero-copy{min-width:0;flex:1}
  .profile-label{display:inline-block;margin-bottom:4px;font-size:10px;font-weight:800;letter-spacing:1.3px;color:#1686b8}
  .profile-hero h1{margin:0 0 4px;font-size:25px;color:#123b59}
  .profile-hero p{margin:0;color:#607589;font-size:13px;line-height:1.4}
  .profile-points-wrap{position:relative;flex:0 0 auto;align-self:flex-start}
  .profile-points-tab{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:132px;padding:0;border:0;background:transparent;color:#123b59;cursor:pointer;font:inherit;text-align:right}
  .profile-points-tab-label{display:inline-block;padding:6px 12px;border-radius:8px 8px 0 0;background:#1a6b7a;color:#fff;font-size:11px;font-weight:800;letter-spacing:.03em;line-height:1.2;white-space:nowrap}
  .profile-points-tab-value{display:block;margin:0;padding:0 2px;font-size:28px;font-weight:700;line-height:1.1;letter-spacing:-.02em;color:#123b59;font-variant-numeric:tabular-nums}
  .profile-points-pop{position:absolute;top:calc(100% + 8px);right:0;z-index:4;width:min(240px,74vw);padding:12px;border-radius:12px;background:#fff;color:#143246;box-shadow:0 8px 24px rgba(20,50,70,.16);text-align:left}
  .profile-points-pop p{margin:0;color:#34546b;font-size:12px;line-height:1.4}
  .profile-points-pop-title{margin:0 0 6px !important;font-size:13px !important;font-weight:800;color:#123b59}
  .profile-redeem-btn{display:block;width:100%;margin-top:10px;border:0;border-radius:8px;padding:8px 10px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
  .profile-refer-wrap,.profile-form{max-width:760px;margin:0 auto 14px}
  .profile-form{display:grid;gap:14px}
  .profile-card{max-width:760px;margin:0 auto 14px;padding:18px;background:#fff;border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,.06);display:grid;gap:12px}
  .profile-field{display:flex;flex-direction:column}
  .profile-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
  .profile-field label span{color:#e34d4d}
  .profile-field input,.profile-field select,.profile-field textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font-size:14px;outline:none;font-family:inherit;height:38px;min-height:38px}
  .profile-field input:read-only{background:#f7fbfd;color:#5d7180}
  .profile-field textarea{height:auto;min-height:64px}
  .profile-field input:focus,.profile-field select:focus,.profile-field textarea:focus{border-color:#1a6b7a;box-shadow:none}
  .profile-error{margin-top:4px;color:#d84b4b;font-size:11px}
  .profile-hint{margin-top:4px;color:#5d7180;font-size:11px}
  .profile-success{margin:0;padding:10px 12px;border-radius:8px;background:#e5f8ee;color:#1c9b61;font-size:13px;font-weight:600}
  .profile-actions{display:flex;flex-wrap:wrap;gap:8px;max-width:760px;margin:0 auto 14px}
  .profile-save-btn,.profile-edit-btn{border:none;border-radius:8px;padding:11px 16px;font-size:14px;font-weight:800;cursor:pointer}
  .profile-save-btn{background:#1a6b7a;color:#fff}
  .profile-edit-btn{background:#fff;color:#1a6b7a;border:1px solid #d7e2e9}
  .profile-member-details{display:grid;gap:10px;margin:0}
  .profile-member-details div{display:grid;gap:2px}
  .profile-member-details dt{font-size:11px;font-weight:800;color:#5d7180}
  .profile-member-details dd{margin:0;font-size:15px;font-weight:700;color:#143246}
  @media (max-width:520px){.profile-hero{flex-wrap:wrap}.profile-points-wrap{margin-left:auto}}
  @media (max-width:800px){.profile-page{padding:14px 10px}.profile-hero{padding:14px}}
`;

export default Profile;
