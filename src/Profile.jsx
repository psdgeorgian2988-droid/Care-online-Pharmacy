import { useEffect, useRef, useState } from "react";
import ReferFamily from "./ReferFamily";
import { awardFamilyMemberPoints, useWallet } from "./pointsStore";
import { pointsRedeemPanel, setRedeemIntent } from "./walletQuote";
import { goBackHash, goToHash, parseAppHash } from "./hashRoute";
import { readTestCart } from "./medicineCartStore";
import AddressFields from "./AddressFields.jsx";
import PersonFields from "./PersonFields.jsx";
import FamilyMembersFields from "./FamilyMembersFields";
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
import ProfileReports from "./ProfileReports.jsx";
import { orderServiceTabs, tabActive } from "./AppBottomNav";
import { MEMBER_ROLE, holderActor } from "./familyAccount";
import { pickLoginPin } from "./loginPin";
import { publishAccount } from "./accountSync";
import AccountPopup from "./AccountPopup.jsx";

function readProfile() {
  return readUserProfile();
}

function ProfileUploads() {
  return (
    <section className="profile-card profile-dashboard" aria-label="My Health Dashboard">
      <h2>My Health Dashboard</h2>
      <ProfileReports />
    </section>
  );
}

function PlaceYourOrder() {
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const { route, service } = parseAppHash(hash);
  return (
    <section className="profile-card profile-place-order" aria-label="Book Medihome Service">
      <h2>Book Medihome Service</h2>
      <div className="profile-order-grid">
        {orderServiceTabs().map((tab) => {
          const active = tabActive(tab.href, route, service);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`is-${tab.icon}${active ? " is-on" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function servicePopupTitle() {
  const { route, service } = parseAppHash(typeof window !== "undefined" ? window.location.hash : "");
  const tab = orderServiceTabs().find((item) => tabActive(item.href, route, service));
  return tab?.label || "Medihome Service";
}

function ServicePopup({ children }) {
  return (
    <AccountPopup title={servicePopupTitle()} onClose={() => goToHash("#profile")}>
      {children}
    </AccountPopup>
  );
}

function Profile({ activity = null } = {}) {
  const wallet = useWallet();
  const session = useLoginSession();
  const holderView = session?.accountRole !== MEMBER_ROLE;
  const [form, setForm] = useState(readProfile);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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
      photo: String(form.photo || "").startsWith("data:image") ? form.photo : "",
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    writeLoginSession(profile, holderActor(profile));
    publishAccount(profile);
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
              <span className="profile-label">My Account</span>
            </div>
          </section>
          <section className="profile-card" aria-label="Your details">
            <h2>Your details</h2>
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
          <ProfileUploads />
          <PlaceYourOrder />
          {activity ? <ServicePopup>{activity}</ServicePopup> : null}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <section className="profile-hero is-account-bar">
          <div className="profile-photo-stack">
            <button
              type="button"
              className="profile-photo"
              aria-label="Profile"
              aria-expanded={accountOpen}
              onClick={() => {
                if (activity) {
                  goToHash("#profile");
                  return;
                }
                setAccountOpen((open) => !open);
              }}
            >
              {form.photo ? <img src={form.photo} alt="" /> : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="9" r="3.2" />
                  <path d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
                </svg>
              )}
            </button>
            {String(form.name || "").trim() ? (
              <button
                type="button"
                className="profile-holder-name"
                aria-expanded={accountOpen}
                onClick={() => {
                if (activity) {
                  goToHash("#profile");
                  return;
                }
                setAccountOpen((open) => !open);
              }}
              >
                {form.name.trim()}
              </button>
            ) : null}
          </div>
          <span className="profile-label">My Account</span>
          <div className="profile-points-wrap" ref={pointsWrapRef}>
            <button
              type="button"
              className="profile-points"
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
              <strong>{pointsPanel.balance.toLocaleString("en-IN")}</strong>
              <span>Points</span>
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
          {accountOpen ? (
            <form className="profile-account-pop" onSubmit={handleSave} autoComplete="off">
              <AutofillTrap />
              <section className="profile-card" aria-label="Account">
                <label className="profile-photo-file">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const source = typeof reader.result === "string" ? reader.result : "";
                        if (!source.startsWith("data:image")) return;
                        const image = new Image();
                        image.onload = () => {
                          const size = 256;
                          const canvas = document.createElement("canvas");
                          canvas.width = size;
                          canvas.height = size;
                          const ctx = canvas.getContext("2d");
                          if (!ctx) return;
                          const scale = Math.max(size / image.width, size / image.height);
                          const width = image.width * scale;
                          const height = image.height * scale;
                          ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                          setForm((prev) => ({ ...prev, photo: canvas.toDataURL("image/jpeg", 0.82) }));
                        };
                        image.src = source;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {editDetails ? (
                  <>
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
                  </>
                ) : (
                  <dl className="profile-summary">
                    <div>
                      <dt>Name</dt>
                      <dd>{form.name || "Not added"}</dd>
                    </div>
                    <div>
                      <dt>Mobile</dt>
                      <dd>{maskMobile(accountCreatorMobile(form)) || "Not added"}</dd>
                    </div>
                    <div>
                      <dt>Mail ID</dt>
                      <dd>{form.email || "Not added"}</dd>
                    </div>
                  </dl>
                )}
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
              </section>
            </form>
          ) : null}
          </section>

        <ProfileUploads />
        <PlaceYourOrder />
        {activity ? <ServicePopup>{activity}</ServicePopup> : null}
        <form className="profile-form" onSubmit={handleSave} autoComplete="off">
          <AutofillTrap />
          <section className="profile-card profile-family" aria-label="Family Members">
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

        </form>

        <div className="profile-refer-wrap">
          <ReferFamily />
        </div>
      </div>
    </>
  );
}

const styles = `
  .profile-page{display:grid;gap:12px;max-width:760px;margin:0 auto;padding:16px 0 32px;background:transparent;color:#17324d;box-sizing:border-box}
  .profile-page > .profile-hero.is-account-bar{margin-bottom:0}
  .profile-page > .profile-hero.is-account-bar + .profile-dashboard{margin-top:-8px}
  .profile-page.is-activity{max-width:none;padding:0 0 24px}
  .profile-page.is-activity .profile-hero,
  .profile-page.is-activity .profile-dashboard,
  .profile-page.is-activity .profile-place-order{max-width:720px;margin-left:auto;margin-right:auto}
  .profile-dashboard,
  .profile-place-order{display:grid !important;grid-template-columns:minmax(0,1fr) !important;width:min(720px,100%) !important;max-width:720px !important;margin-left:auto !important;margin-right:auto !important;justify-self:center}
  .profile-card.profile-dashboard > h2,
  .profile-card.profile-place-order > h2{display:inline-block;justify-self:center;grid-column:1 / -1;width:max-content;max-width:100%;margin:0 auto;padding:7px 18px;border-radius:999px;color:#fff;-webkit-text-fill-color:#fff;font-size:16px;font-weight:800;letter-spacing:.02em;line-height:1.2;text-align:center;text-transform:none}
  .profile-card.profile-dashboard > h2{background:linear-gradient(115deg,#0d9488 0%,#22c55e 46%,#0ea5e9 100%);box-shadow:0 8px 18px rgba(13,148,136,.28)}
  .profile-card.profile-place-order > h2{background:linear-gradient(115deg,#7c3aed 0%,#ec4899 50%,#f97316 100%);box-shadow:0 8px 18px rgba(124,58,237,.28)}
  .profile-dashboard .profile-reports,
  .profile-place-order .profile-order-grid{grid-column:1 / -1;width:100%}
  .profile-activity{min-width:0}
  .profile-order-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .profile-order-grid a{display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:46px;padding:8px 10px;border:1px solid transparent;border-radius:16px;font-size:13px;font-weight:800;line-height:1.2;text-align:center;text-decoration:none;box-shadow:0 1px 0 rgba(255,255,255,.7) inset, 0 6px 14px rgba(20,50,70,.06);transition:transform .12s ease, box-shadow .12s ease, background .12s ease}
  .profile-order-grid a:hover{transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.7) inset, 0 8px 16px rgba(20,50,70,.1)}
  .profile-order-grid a.is-on{box-shadow:inset 0 0 0 2px currentColor, 0 6px 14px rgba(20,50,70,.08)}
  .profile-order-grid a.is-medicine{background:#d7f1ec;color:#1f6f64;border-color:#b7e4dc}
  .profile-order-grid a.is-lab{background:#fff1d4;color:#8a5a12;border-color:#f0d7a2}
  .profile-order-grid a.is-radiology{background:#e6eefc;color:#3d5c99;border-color:#c9d7f4}
  .profile-order-grid a.is-homecare{background:#fff0d6;color:#8a5a1e;border-color:#f0d3a4}
  .profile-order-grid a.is-vaccination{background:#def3e3;color:#21743a;border-color:#b7e2c4}
  .profile-order-grid a.is-doctor{background:#fde8eb;color:#9a3d4b;border-color:#f4c9d0}
  .profile-order-grid a.is-psychologist{background:#eee8ff;color:#5648a0;border-color:#d5ccf4}
  .profile-order-grid a.is-stepdown{background:#e6eef2;color:#3d5c70;border-color:#c9d7e0}
  .profile-order-grid a.is-ambulance{background:#ffe6e6;color:#9a3d3d;border-color:#f4c9c9}
  .profile-order-grid a.is-record{background:#e6eef8;color:#34598a;border-color:#c9d6ee}
  .profile-order-grid a.is-education{background:#e5f6f1;color:#1f6a5b;border-color:#bfe6db}
  .profile-hero{margin:0;padding:16px 18px;border-radius:14px;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;box-shadow:0 3px 12px rgba(0,0,0,.06)}
  .profile-hero-copy{min-width:0;flex:1}
  .profile-photo-stack{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:56px;max-width:140px}
  .profile-account-pop{grid-column:1 / -1;width:min(720px,100%);max-width:720px;margin:4px auto 0;justify-self:center}
  .profile-holder-name{border:0;background:transparent;padding:0;margin:0;font:inherit;font-size:13px;font-weight:800;line-height:1.25;color:#143246;text-align:center;cursor:pointer}
  .profile-photo{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:0;border-radius:50%;overflow:hidden;background:#e7f1f4;color:#1a6b7a;cursor:pointer}
  .profile-photo img{width:100%;height:100%;object-fit:cover}
  .profile-photo svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .profile-photo-file{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
  .profile-photo-file input{font:inherit;font-size:13px;font-weight:600}
  .profile-label{display:inline-block;justify-self:center;width:max-content;max-width:100%;margin:0 auto;padding:7px 18px;border-radius:999px;background:linear-gradient(115deg,#14b8a6 0%,#3b82f6 42%,#ec4899 78%,#f59e0b 100%);color:#fff;font-size:16px;font-weight:800;letter-spacing:.02em;line-height:1.2;text-align:center;text-transform:none;box-shadow:0 8px 18px rgba(59,130,246,.28)}
  .profile-hero h1{margin:0 0 4px;font-size:24px;color:#123b59}
  .profile-hero p{margin:0;color:#607589;font-size:13px;line-height:1.4}
  .profile-points-wrap{position:relative;flex:0 0 auto}
  .profile-points{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:76px;padding:8px 12px;border:0;border-radius:12px;background:#eef7f8;color:#123b59;cursor:pointer;font:inherit}
  .profile-points strong{font-size:22px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
  .profile-points span{font-size:11px;font-weight:800;color:#1a6b7a}
  .profile-points-pop{position:absolute;top:calc(100% + 8px);right:0;z-index:4;width:min(240px,74vw);padding:12px;border-radius:12px;background:#fff;color:#143246;box-shadow:0 8px 24px rgba(20,50,70,.16);text-align:left}
  .profile-points-pop p{margin:0;color:#34546b;font-size:12px;line-height:1.4}
  .profile-points-pop-title{margin:0 0 6px !important;font-size:13px !important;font-weight:800;color:#123b59}
  .profile-redeem-btn{display:block;width:100%;margin-top:10px;border:0;border-radius:8px;padding:8px 10px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
  .profile-refer-wrap{margin:0}
  .profile-refer-wrap .points-refer-card{box-shadow:0 3px 12px rgba(0,0,0,.06)}
  .profile-form{display:grid;gap:12px;margin:0;max-width:none}
  .profile-card{margin:0;padding:16px 18px;background:#fff;border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,.06);display:grid;gap:12px}
  .profile-card h2{margin:0;font-size:16px;color:#123b59}
  .profile-summary,.profile-member-details{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:0}
  .profile-summary div,.profile-member-details div{display:grid;gap:2px;padding:10px 12px;border-radius:10px;background:#f4fafb}
  .profile-summary dt,.profile-member-details dt{font-size:11px;font-weight:800;color:#5d7180}
  .profile-summary dd,.profile-member-details dd{margin:0;font-size:15px;font-weight:700;color:#143246}
  .profile-order-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
  .profile-order-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:#f4fafb;font-size:14px}
  .profile-order-list a{color:#1a6b7a;font-weight:800;text-decoration:underline}
  .profile-order-list strong{font-weight:800;color:#1a6b7a}
  .profile-order-empty{margin:0;color:#5d7180;font-size:14px}
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
  .profile-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0}
  .profile-save-btn,.profile-edit-btn{border:none;border-radius:8px;padding:11px 16px;font-size:14px;font-weight:800;cursor:pointer}
  .profile-save-btn{background:#1a6b7a;color:#fff}
  .profile-edit-btn{background:#fff;color:#1a6b7a;border:1px solid #d7e2e9}
  @media (max-width:520px){.profile-hero{align-items:flex-start}}
  @media (max-width:800px){.profile-page{padding:12px 0 28px}.profile-hero,.profile-card{padding:14px}}
`;

export default Profile;
