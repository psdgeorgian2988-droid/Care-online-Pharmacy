import { useEffect, useState } from "react";
import { kindLabel } from "./orderTracking";
import { partnerSettlementNote, splitModeLabel } from "./paymentSplit";
import { shareSettlement } from "./shareSettlement";
import { isOnlinePayment } from "./paymentMethods";
import { fetchPartnerJobs, partnerLogin, partnerLogout, partnerSession, patchPartnerJob } from "./partnerApi";
import { canShowRiderRetailerScan, scanHref } from "./orderQr";

export default function Partner() {
  const session = partnerSession();
  const [token, setToken] = useState(session.token);
  const [partner, setPartner] = useState(session.partner);
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collectingId, setCollectingId] = useState("");

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

  const collectJob = async (job, paymentMethod) => {
    const id = job.id || job.bookingId || job.requestId;
    setCollectingId(id);
    setError("");
    try {
      await patchPartnerJob(id, { collectPayment: true, paymentMethod });
      await loadJobs();
    } catch (err) {
      setError(err.message || "Could Not Record Collection.");
    } finally {
      setCollectingId("");
    }
  };

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

  const showScanCol = jobs.some((job) => canShowRiderRetailerScan(job, partner));

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
            <p>Assigned Jobs Only. Settlement Ledger Is Shared On Each Job.</p>
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
                {showScanCol ? <th>Scan Delivery</th> : null}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={showScanCol ? 7 : 6}>
                    {loading
                      ? "Loading…"
                      : "No Jobs Yet. Staff Assign Work From #admin."}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const id = job.id || job.bookingId || job.requestId;
                  const paid = String(job.paymentStatus || "").toLowerCase() === "paid";
                  const needsCollect = !paid;
                  return (
                    <tr key={id}>
                      <td>#{id}</td>
                      <td>{kindLabel(job.kind || job.orderType)}</td>
                      <td>
                        {job.pinCode || job.pin || "—"}
                        {job.outletName ? ` · ${job.outletName}` : ""}
                      </td>
                      <td>
                        {isOnlinePayment(job.paymentMethod) ? "Online" : "COD"}
                        {job.paymentStatus ? ` · ${job.paymentStatus}` : ""}
                        {paid && job.collector === "medihome" ? (
                          <>
                            <br />
                            Paid To MediHome
                          </>
                        ) : null}
                        {paid && job.collector === "partner" ? (
                          <>
                            <br />
                            Collected By Partner
                          </>
                        ) : null}
                        {job.split?.splitMode ? (
                          <>
                            <br />
                            {splitModeLabel(job.split)}
                          </>
                        ) : null}
                      </td>
                      <td>
                        {job.split?.partnerRupees != null
                          ? `₹${Number(job.split.partnerRupees).toLocaleString("en-IN")}${
                              job.split.partnerPercent != null
                                ? ` (${job.split.partnerPercent}% MRP)`
                                : ""
                            }`
                          : "—"}
                        {partnerSettlementNote(job.split, {
                          collector: job.collector,
                          paymentMethod: job.paymentMethod,
                          paidOn: job.paidOn,
                        }) ? (
                          <>
                            <br />
                            {partnerSettlementNote(job.split, {
                              collector: job.collector,
                              paymentMethod: job.paymentMethod,
                              paidOn: job.paidOn,
                            })}
                          </>
                        ) : null}
                        {needsCollect ? (
                          <div className="partner-collect">
                            <button
                              type="button"
                              disabled={collectingId === id}
                              onClick={() => collectJob(job, "cod")}
                            >
                              Collect Cash
                            </button>
                            <button
                              type="button"
                              disabled={collectingId === id}
                              onClick={() => collectJob(job, "upi")}
                            >
                              Collect Online
                            </button>
                          </div>
                        ) : job.split ? (
                          <ShareLedgerButton split={job.split} />
                        ) : null}
                      </td>
                      <td>{job.status || job.trackStatus || "—"}</td>
                      {showScanCol ? (
                        <td>
                          {canShowRiderRetailerScan(job, partner) ? (
                            <a
                              className="partner-scan-link"
                              href={scanHref({ id, step: "pickup", order: job })}
                            >
                              Scan Delivery
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
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

function ShareLedgerButton({ split }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <button
        type="button"
        className="partner-share-ledger"
        onClick={async () => {
          const result = await shareSettlement(split);
          setNote(
            result === "shared" ? "Shared." : result === "copied" ? "Copied." : ""
          );
        }}
      >
        Share Ledger
      </button>
      {note ? <span> {note}</span> : null}
    </div>
  );
}

const styles = `
.partner-page{max-width:1100px}
.admin-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.admin-hero-actions{display:flex;flex-wrap:wrap;gap:6px}
.admin-hero-actions button{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer}
.partner-share-ledger{margin-top:6px;border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:4px 8px;cursor:pointer}
.partner-collect{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.partner-collect button{border:1px solid #1a6b7a;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:700;padding:4px 8px;cursor:pointer}
.partner-collect button:disabled{opacity:.6;cursor:wait}
.partner-scan-link{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 8px;border-radius:6px;background:#1a6b7a;color:#fff;font-size:12px;font-weight:700;text-decoration:none}
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
