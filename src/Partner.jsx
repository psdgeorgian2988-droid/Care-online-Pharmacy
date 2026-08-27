import { useEffect, useState } from "react";
import {
  fetchPartnerJobs,
  partnerLogin,
  partnerLogout,
  partnerSession,
} from "./partnerApi";
import { kindLabel } from "./orderTracking";

export default function Partner() {
  const session = partnerSession();
  const [token, setToken] = useState(session.token);
  const [partner, setPartner] = useState(session.partner);
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPartnerJobs();
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err) {
      setError(err.message || "Could Not Load Jobs.");
      if (String(err.message || "").toLowerCase().includes("login")) {
        partnerLogout();
        setToken("");
        setPartner(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadJobs();
  }, [token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await partnerLogin(mobile.trim(), pin.trim());
      setToken(data.token);
      setPartner(data.partner);
      setPin("");
    } catch (err) {
      setError(err.message || "Login Failed.");
    }
  };

  if (!token || !partner) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page partner-page">
          <section className="service-hero">
            <span className="service-kicker">Partner Operations</span>
            <h1>Partner Login</h1>
            <p>See Only Jobs Assigned To You By MediHome Staff.</p>
          </section>
          <form className="service-form admin-login" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="partner-mobile">Mobile</label>
              <input
                id="partner-mobile"
                inputMode="numeric"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="partner-pin">PIN</label>
              <input
                id="partner-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
            <p className="admin-hint">
              Demo: 9654222901–2906, PIN 1111 (rider, lab, radiology, Home Care,
              ambulance, step-down).
            </p>
            <button type="submit" className="service-submit">
              Sign In
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="service-page partner-page">
        <section className="service-hero admin-hero">
          <div>
            <span className="service-kicker">{partner.role}</span>
            <h1>{partner.name}</h1>
            <p>Assigned Jobs Only. Split Is Visible Here, Not To Customers.</p>
          </div>
          <div className="admin-hero-actions">
            <button type="button" onClick={loadJobs} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => {
                partnerLogout();
                setToken("");
                setPartner(null);
                setJobs([]);
              }}
            >
              Sign Out
            </button>
          </div>
        </section>
        {error ? <p className="admin-error">{error}</p> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>PIN / Outlet</th>
                <th>Pay</th>
                <th>Your Share</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    {loading
                      ? "Loading…"
                      : "No Jobs Yet. Staff Assign Work From #admin."}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const id = job.id || job.bookingId || job.requestId;
                  return (
                    <tr key={id}>
                      <td>#{id}</td>
                      <td>{kindLabel(job.kind || job.orderType)}</td>
                      <td>
                        {job.pinCode || job.pin || "—"}
                        {job.outletName ? ` · ${job.outletName}` : ""}
                      </td>
                      <td>
                        {job.paymentMethod === "online" ? "Online" : "COD"}
                        {job.paymentStatus ? ` · ${job.paymentStatus}` : ""}
                      </td>
                      <td>
                        {job.split?.partnerRupees != null
                          ? `₹${Number(job.split.partnerRupees).toLocaleString("en-IN")}${
                              job.split.partnerPercent != null
                                ? ` (${job.split.partnerPercent}% MRP)`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td>{job.status || job.trackStatus || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const styles = `
.partner-page{max-width:1100px}
.admin-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.admin-hero-actions{display:flex;flex-wrap:wrap;gap:6px}
.admin-hero-actions button{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer}
.admin-login{max-width:420px}
.admin-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.admin-error{grid-column:1/-1;color:#d84b4b;font-size:13px}
.admin-table-wrap{overflow:auto;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.admin-table{width:100%;border-collapse:collapse;font-size:13px}
.admin-table th,.admin-table td{padding:8px 10px;border-bottom:1px solid #edf1f3;text-align:left}
.admin-table th{background:#f7fafc;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.partner-page .service-hero h1{margin:0 0 4px;font-size:22px}
.partner-page .service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.partner-page .service-hero{margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.partner-page .service-form{display:grid;grid-template-columns:1fr;gap:10px;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.partner-page .field{display:flex;flex-direction:column}
.partner-page label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.partner-page input,.partner-page .service-submit{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
.partner-page .service-submit{border:none;background:#1a6b7a;color:#fff;font-weight:700;min-height:40px;cursor:pointer}
@media (max-width:800px){.admin-hero{flex-direction:column}}
`;
