import { useState } from "react";
import AddressFields from "./AddressFields";
import {
  createStaffPartner,
  openStaffPartnerDocument,
  resetStaffPartnerPassword,
} from "./adminApi";
import { EMPTY_ADDRESS } from "./addressFields";
import { kindLabel } from "./orderTracking";
import { detectPinFromLocation } from "./pinLocation";
import {
  loginIdFromContact,
  needsHomeVisitDocs,
  PARTNER_SERVICE_OPTIONS,
} from "./partnerProfile";

const emptyForm = {
  ...EMPTY_ADDRESS,
  kinds: ["medicine"],
  businessName: "",
  contactName: "",
  mobile: "",
  email: "",
  lat: "",
  lng: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  aadhaar: null,
  policeVerification: null,
};

function serviceLabel(partner) {
  const kinds = partner.kinds || [];
  const labels = kinds.map((kind) => kindLabel(kind));
  if (partner.physiotherapy && !labels.includes("Physiotherapy")) {
    labels.push("Physiotherapy");
  }
  return labels.join(", ") || "—";
}

function readUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (file.size > 1_500_000) {
      reject(new Error("Each Document Must Be Under 1.5 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        fileName: file.name,
        mime: file.type,
        dataUrl: String(reader.result || ""),
      });
    reader.onerror = () => reject(new Error("Could Not Read The File."));
    reader.readAsDataURL(file);
  });
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function AdminPartnerLogins({ partners, onChange }) {
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [issued, setIssued] = useState(null);

  const homeVisit = needsHomeVisitDocs(form.kinds, form.kinds.includes("physiotherapy"));
  const pharmacy = form.kinds.includes("medicine");
  const previewLogin = loginIdFromContact(form.mobile, form.email);

  const patch = (next) => setForm((current) => ({ ...current, ...next }));

  const closeForm = () => {
    setMode("list");
    setForm(emptyForm);
    setError("");
  };

  const openDocument = async (partner, kind) => {
    setError("");
    try {
      await openStaffPartnerDocument(partner.id, kind);
    } catch (err) {
      setError(err.message || "Could Not Open The Document.");
    }
  };

  const resetPassword = async (partner) => {
    setBusyId(partner.id);
    setError("");
    setNote("");
    try {
      const data = await resetStaffPartnerPassword(partner.id);
      onChange?.(data.partners || []);
      setIssued({
        title: `Password Reset For ${data.partner?.name || partner.name}`,
        loginId: data.loginId,
        password: data.password,
      });
    } catch (err) {
      setError(err.message || "Could Not Reset The Password.");
    } finally {
      setBusyId("");
    }
  };

  const savePartner = async (event) => {
    event.preventDefault();
    setBusyId("new");
    setError("");
    setNote("");
    try {
      const data = await createStaffPartner({
        kinds: form.kinds,
        physiotherapy: form.kinds.includes("physiotherapy"),
        businessName: form.businessName,
        contactName: form.contactName,
        mobile: form.mobile,
        email: form.email,
        houseNo: form.houseNo,
        society: form.society,
        area: form.area,
        city: form.city,
        district: form.district,
        state: form.state,
        pinCode: form.pinCode,
        nearby: form.nearby,
        lat: form.lat,
        lng: form.lng,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        ifsc: form.ifsc,
        aadhaar: form.aadhaar,
        policeVerification: form.policeVerification,
      });
      onChange?.(data.partners || []);
      setForm(emptyForm);
      setMode("list");
      setIssued({
        title: `Partner Saved: ${data.partner?.name || form.contactName}`,
        loginId: data.loginId,
        password: data.password,
      });
    } catch (err) {
      setError(err.message || "Could Not Save The Partner.");
    } finally {
      setBusyId("");
    }
  };

  const useLocation = async () => {
    setLocating(true);
    setError("");
    try {
      const found = await detectPinFromLocation();
      patch({
        pinCode: found.pin || found.pinCode || "",
        lat: found.lat,
        lng: found.lng,
        city: found.city || form.city,
        district: found.district || form.district,
        state: found.state || form.state,
      });
    } catch (err) {
      setError(err.message || "Could Not Read The Location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <section className="pl-desk" aria-label="Partner Logins">
      <style>{styles}</style>
      <header className="pl-head">
        <div>
          <h2>Partner Logins</h2>
          <p>
            Add A Partner, Then Share The Login ID Created From Mobile And Email.
            The First Password Is Generated For You. Partners Can Change It After
            Sign-In. Staff Can Reset It Here.
          </p>
        </div>
        {mode === "list" ? (
          <button type="button" className="pl-primary" onClick={() => setMode("form")}>
            Add Partner
          </button>
        ) : (
          <button type="button" className="pl-ghost" onClick={closeForm}>
            Back To Partners
          </button>
        )}
      </header>

      {error ? <p className="pl-error">{error}</p> : null}
      {note ? <p className="pl-note">{note}</p> : null}

      {issued ? (
        <div className="pl-issued" role="status">
          <strong>{issued.title}</strong>
          <p>Share These Details Once. The Password Is Not Shown Again.</p>
          <dl>
            <div>
              <dt>Login ID</dt>
              <dd>
                <code>{issued.loginId}</code>
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyText(issued.loginId)) setNote("Login ID Copied.");
                  }}
                >
                  Copy
                </button>
              </dd>
            </div>
            <div>
              <dt>First Password</dt>
              <dd>
                <code>{issued.password}</code>
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyText(issued.password)) setNote("Password Copied.");
                  }}
                >
                  Copy
                </button>
              </dd>
            </div>
          </dl>
          <button type="button" className="pl-ghost" onClick={() => setIssued(null)}>
            Done
          </button>
        </div>
      ) : null}

      {mode === "form" ? (
        <form className="pl-form" onSubmit={savePartner}>
          <section>
            <h3>1. Service</h3>
            <div className="pl-services">
              {PARTNER_SERVICE_OPTIONS.map((row) => {
                const on = form.kinds.includes(row.key);
                return (
                  <label key={row.key} className={on ? "is-on" : ""}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = on
                          ? form.kinds.filter((key) => key !== row.key)
                          : [...form.kinds, row.key];
                        if (!next.length) return;
                        patch({ kinds: next });
                      }}
                    />
                    {row.label}
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <h3>2. Business And Contact</h3>
            <div className="pl-grid">
              {pharmacy ? (
                <label>
                  Name Of The Business
                  <input
                    value={form.businessName}
                    onChange={(event) => patch({ businessName: event.target.value })}
                    placeholder="Pharmacy Name"
                    required
                  />
                </label>
              ) : (
                <label>
                  Name Of The Business
                  <input
                    value={form.businessName}
                    onChange={(event) => patch({ businessName: event.target.value })}
                    placeholder="Optional"
                  />
                </label>
              )}
              <label>
                Concerned Person Name
                <input
                  value={form.contactName}
                  onChange={(event) => patch({ contactName: event.target.value })}
                  required
                />
              </label>
              <label>
                Mobile No.
                <input
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(event) =>
                    patch({ mobile: event.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  required
                />
              </label>
              <label>
                Email ID
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => patch({ email: event.target.value })}
                  required
                />
              </label>
            </div>
            <p className="pl-login-preview">
              Login ID Will Be{" "}
              <strong>{previewLogin || "Created From Mobile And Email"}</strong>
              . First Password Is Generated On Save.
            </p>
          </section>

          <section>
            <h3>3. Address, PIN Code And Geolocation</h3>
            <div className="pl-location-row">
              <button type="button" className="pl-ghost" onClick={useLocation} disabled={locating}>
                {locating ? "Reading Location…" : "Use Current Location"}
              </button>
              {form.lat !== "" && form.lng !== "" ? (
                <span>
                  Lat {Number(form.lat).toFixed(5)}, Lng {Number(form.lng).toFixed(5)}
                </span>
              ) : (
                <span>Location Is Captured When You Use Current Location.</span>
              )}
            </div>
            <AddressFields
              idPrefix="partner-addr"
              values={form}
              onChange={(event) => patch({ [event.target.name]: event.target.value })}
              showUseMyLocation={false}
            />
          </section>

          <section>
            <h3>4. Bank Account</h3>
            <div className="pl-grid">
              <label>
                Account Holder Name
                <input
                  value={form.accountName}
                  onChange={(event) => patch({ accountName: event.target.value })}
                  required
                />
              </label>
              <label>
                Account Number
                <input
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(event) =>
                    patch({
                      accountNumber: event.target.value.replace(/\D/g, "").slice(0, 18),
                    })
                  }
                  required
                />
              </label>
              <label>
                IFSC Code
                <input
                  value={form.ifsc}
                  onChange={(event) =>
                    patch({ ifsc: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) })
                  }
                  placeholder="HDFC0001234"
                  required
                />
              </label>
            </div>
          </section>

          {homeVisit ? (
            <section>
              <h3>5. Home Visit Documents</h3>
              <p>
                Home Care And Physiotherapy Require An Aadhaar Card Photo And Police
                Verification.
              </p>
              <div className="pl-grid">
                <label>
                  Aadhaar Card Photo
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (event) => {
                      try {
                        patch({ aadhaar: await readUpload(event.target.files?.[0]) });
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                    required
                  />
                  {form.aadhaar?.fileName ? <small>{form.aadhaar.fileName}</small> : null}
                </label>
                <label>
                  Police Verification
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (event) => {
                      try {
                        patch({
                          policeVerification: await readUpload(event.target.files?.[0]),
                        });
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                    required
                  />
                  {form.policeVerification?.fileName ? (
                    <small>{form.policeVerification.fileName}</small>
                  ) : null}
                </label>
              </div>
            </section>
          ) : null}

          <div className="pl-actions">
            <button type="button" className="pl-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="pl-primary" disabled={busyId === "new"}>
              {busyId === "new" ? "Saving…" : "Save Partner"}
            </button>
          </div>
        </form>
      ) : (
        <div className="pl-list">
          {partners.length === 0 ? (
            <p className="pl-empty">No Partners Yet. Click Add Partner To Create The First Login.</p>
          ) : (
            partners.map((partner) => (
              <article key={partner.id} className="pl-card">
                <div>
                  <h3>{partner.name}</h3>
                  <p>{serviceLabel(partner)}</p>
                  <p>
                    {partner.contactName && partner.contactName !== partner.name
                      ? `${partner.contactName} · `
                      : ""}
                    {partner.mobile || "No Mobile"}
                    {partner.email ? ` · ${partner.email}` : ""}
                  </p>
                  <p className="pl-meta">
                    Login ID: <strong>{partner.loginId || "Not Created Yet"}</strong>
                    {partner.ifsc ? ` · ${partner.ifsc} •••• ${partner.accountLast4 || ""}` : ""}
                  </p>
                </div>
                <div className="pl-card-side">
                  <span className={partner.hasLogin ? "pl-pill is-ok" : "pl-pill"}>
                    {partner.hasLogin
                      ? partner.mustChangePassword
                        ? "Ask Partner To Change Password"
                        : "Login Active"
                      : "Needs First Login"}
                  </span>
                  <div className="pl-card-actions">
                    {partner.hasAadhaar ? (
                      <button type="button" onClick={() => openDocument(partner, "aadhaar")}>
                        Aadhaar
                      </button>
                    ) : null}
                    {partner.hasPoliceVerification ? (
                      <button type="button" onClick={() => openDocument(partner, "police")}>
                        Police Verification
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="pl-reset"
                      disabled={busyId === partner.id}
                      onClick={() => resetPassword(partner)}
                    >
                      {busyId === partner.id ? "Resetting…" : "Reset Password"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

const styles = `
.pl-desk{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:16px 18px;margin-bottom:14px}
.pl-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}
.pl-head h2{margin:0 0 6px;font-size:18px;color:#123b5d}
.pl-head p{margin:0;max-width:640px;color:#5d7180;font-size:13px;line-height:1.45}
.pl-primary,.pl-ghost,.pl-reset,.pl-card-actions button,.pl-issued button{border-radius:8px;font:inherit;font-size:13px;font-weight:700;padding:8px 14px;cursor:pointer}
.pl-primary{border:1px solid #1a6b7a;background:#1a6b7a;color:#fff}
.pl-ghost,.pl-card-actions button{border:1px solid #d7e2e9;background:#fff;color:#1a6b7a}
.pl-reset{border:1px solid #1a6b7a;background:#fff;color:#1a6b7a}
.pl-error{margin:0 0 10px;color:#d84b4b;font-size:13px;font-weight:700}
.pl-note{margin:0 0 10px;color:#1a6b7a;font-size:13px;font-weight:700}
.pl-issued{margin:0 0 14px;padding:14px;border:1px solid #b7e0c8;border-radius:12px;background:#f3fbf6}
.pl-issued strong{display:block;margin-bottom:4px;color:#1a7a45}
.pl-issued p{margin:0 0 10px;color:#34546b;font-size:13px}
.pl-issued dl{margin:0 0 10px;display:grid;gap:8px}
.pl-issued dt{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.pl-issued dd{margin:0;display:flex;gap:8px;align-items:center}
.pl-issued code{font-size:15px;font-weight:800;color:#123b5d}
.pl-form{display:grid;gap:16px}
.pl-form section{padding:14px;border:1px solid #e4ecef;border-radius:12px;background:#fbfcfd}
.pl-form h3{margin:0 0 10px;font-size:14px;color:#123b5d}
.pl-form p{margin:0 0 10px;color:#5d7180;font-size:13px}
.pl-services{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pl-services label{display:flex;align-items:center;gap:8px;margin:0;padding:10px 12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#34546b;cursor:pointer}
.pl-services label.is-on{border-color:#1a6b7a;background:#eef7f8;color:#1a6b7a}
.pl-desk input[type="checkbox"]{width:16px;height:16px;margin:0;padding:0;flex:0 0 16px;accent-color:#1a6b7a}
.pl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pl-form label{display:flex;flex-direction:column;gap:6px;margin:0;font-size:12px;font-weight:700;color:#34546b}
.pl-form input[type="text"],.pl-form input[type="email"],.pl-form input[type="password"],.pl-form input:not([type]),.pl-form input[type="tel"],.pl-form input[inputmode="numeric"]{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;font:inherit}
.pl-form input[type="file"]{width:100%;box-sizing:border-box;padding:8px 0;border:0;background:transparent;font:inherit}
.pl-login-preview{margin:12px 0 0 !important}
.pl-location-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px;color:#5d7180;font-size:13px}
.pl-actions{display:flex;justify-content:flex-end;gap:8px}
.pl-list{display:grid;gap:10px}
.pl-empty{margin:0;padding:18px;border:1px dashed #d7e2e9;border-radius:12px;color:#5d7180;text-align:center}
.pl-card{display:flex;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid #e4ecef;border-radius:12px;background:#fbfcfd}
.pl-card h3{margin:0 0 4px;font-size:16px;color:#123b5d}
.pl-card p{margin:0 0 4px;color:#5d7180;font-size:13px}
.pl-meta{color:#34546b !important}
.pl-card-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.pl-pill{display:inline-flex;padding:4px 8px;border-radius:99px;background:#fff3e4;color:#c47a2c;font-size:11px;font-weight:800}
.pl-pill.is-ok{background:#e7f6ef;color:#1a7a45}
.pl-card-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
@media (max-width:900px){
  .pl-head,.pl-card,.pl-card-side{flex-direction:column;align-items:stretch}
  .pl-services,.pl-grid{grid-template-columns:1fr}
  .pl-card-side,.pl-card-actions{align-items:flex-start;justify-content:flex-start}
}
`;
