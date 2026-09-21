import { useEffect, useMemo, useState } from "react";
import { kindLabel } from "./orderTracking";
import {
  PARTNER_SHARE_LABEL,
  partnerPercentFor,
  partnerSettlementNote,
  platformPercentFor,
  splitModeLabel,
  splitPayment,
} from "./paymentSplit";
import { shareSettlement } from "./shareSettlement";
import {
  PAYMENT_METHOD_OPTIONS,
  isOnlinePayment,
  paymentMethodLabel,
} from "./paymentMethods";
import {
  fetchPartnerJobs,
  partnerLogin,
  partnerLogout,
  partnerSession,
  patchPartnerJob,
} from "./partnerApi";
import { isMedicineRiderPartner, scanHref } from "./orderQr";
import {
  partnerAcceptFields,
  partnerDeclineFields,
} from "./orderConfirm";
import {
  assignTechnicianFields,
  diagnosticCompleteFields,
  isDiagnosticKind,
  nextDiagnosticAction,
  reportReadyFields,
  sampleCollectedFields,
} from "./labPipeline";

function formatRupee(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function previewPartnerSplit(job, paymentMethod) {
  const kind = job.kind || job.orderType || "medicine";
  const pin = job.pinCode || job.pin || "";
  const payable = Number(
    job.split?.payableRupees ?? job.total ?? job.charges ?? 0
  );
  const sale = Number(
    job.split?.saleRupees ?? job.saleRupees ?? payable
  );
  return splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    couponCode: job.split?.couponCode || job.couponCode || "",
    platformPercent: job.split?.platformPercent,
    paymentMethod,
    paidOn: "partner",
  });
}

export default function Partner() {
  const session = partnerSession();
  const [token, setToken] = useState(session.token);
  const [partner, setPartner] = useState(session.partner);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collectingId, setCollectingId] = useState("");
  const [collectMethodByJob, setCollectMethodByJob] = useState({});

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
      setCollectMethodByJob((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadJobs();
    } catch (err) {
      setError(err.message || "Could Not Record Collection.");
    } finally {
      setCollectingId("");
    }
  };

  const decideJob = async (job, decision) => {
    const id = job.id || job.bookingId || job.requestId;
    setCollectingId(id);
    setError("");
    try {
      const fields =
        decision === "accept" ? partnerAcceptFields() : partnerDeclineFields();
      await patchPartnerJob(id, {
        trackStatus: fields.trackStatus,
        status:
          decision === "accept" &&
          (job.paymentMethod === "pending" ||
            job.paymentStatus === "awaiting_partner")
            ? "Confirmed — payment pending"
            : fields.status,
        partnerConfirmed: fields.partnerConfirmed,
        partnerConfirmStatus: fields.partnerConfirmStatus,
        partnerConfirmedAt: fields.partnerConfirmedAt,
        trackCompleted: fields.trackCompleted,
        ...(decision === "accept" &&
        (job.paymentMethod === "pending" ||
          job.paymentStatus === "awaiting_partner")
          ? { paymentStatus: "awaiting_payment" }
          : {}),
      });
      await loadJobs();
    } catch (err) {
      setError(err.message || "Could Not Update Request.");
    } finally {
      setCollectingId("");
    }
  };

  const advanceDiagnostic = async (job, fields) => {
    const id = job.id || job.bookingId || job.requestId;
    setCollectingId(id);
    setError("");
    try {
      await patchPartnerJob(id, fields);
      await loadJobs();
    } catch (err) {
      setError(err.message || "Could Not Update Lab Job.");
    } finally {
      setCollectingId("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await partnerLogin(loginId, password);
      setToken(data.token);
      setPartner(data.partner);
      setPassword("");
    } catch (err) {
      setError(err.message || "Login Failed.");
    }
  };

  const showScanCol = isMedicineRiderPartner(partner);

  if (!token || !partner) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page partner-page">
          <section className="service-hero">
            <span className="service-kicker">Partner Operations</span>
            <h1>Partner Login</h1>
          </section>
          <form className="service-form admin-login" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="partner-login-id">Login ID</label>
              <input
                id="partner-login-id"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="partner-password">Password</label>
              <input
                id="partner-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
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
                <th>Split &amp; Collection</th>
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
                  const paid =
                    String(job.paymentStatus || "").toLowerCase() === "paid";
                  const needsCollect = !paid;
                  const method =
                    collectMethodByJob[id] ||
                    (isOnlinePayment(job.paymentMethod) ? "upi" : "cod");
                  const kind = job.kind || job.orderType || "medicine";
                  const platformPct = platformPercentFor(
                    kind,
                    job.split?.platformPercent
                  );
                  const partnerPct = partnerPercentFor(
                    kind,
                    job.split?.platformPercent
                  );
                  const preview = needsCollect
                    ? previewPartnerSplit(job, method)
                    : null;
                  const partnerLabel =
                    PARTNER_SHARE_LABEL[kind] ||
                    job.split?.partnerLabel ||
                    "Partner";

                  return (
                    <tr key={id}>
                      <td>#{id}</td>
                      <td>{kindLabel(kind)}</td>
                      <td>
                        {job.pinCode || job.pin || "—"}
                        {job.outletName ? ` · ${job.outletName}` : ""}
                      </td>
                      <td>
                        {isOnlinePayment(job.paymentMethod)
                          ? paymentMethodLabel(job.paymentMethod)
                          : "Cash / COD"}
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
                        <div className="partner-split-box">
                          <p>
                            Rule: MediHome {platformPct}% · {partnerLabel}{" "}
                            {partnerPct}% of MRP
                          </p>
                          {job.split?.partnerRupees != null ? (
                            <p>
                              Your share {formatRupee(job.split.partnerRupees)}
                              {job.split.partnerPercent != null
                                ? ` (${job.split.partnerPercent}% MRP)`
                                : ""}
                              {job.split.payableRupees != null
                                ? ` · Collect ${formatRupee(job.split.payableRupees)}`
                                : ""}
                            </p>
                          ) : null}
                          {partnerSettlementNote(job.split, {
                            collector: job.collector,
                            paymentMethod: job.paymentMethod,
                            paidOn: job.paidOn,
                          }) ? (
                            <p>
                              {partnerSettlementNote(job.split, {
                                collector: job.collector,
                                paymentMethod: job.paymentMethod,
                                paidOn: job.paidOn,
                              })}
                            </p>
                          ) : null}
                        </div>

                        {needsCollect ? (
                          <PartnerCollectPanel
                            jobId={id}
                            method={method}
                            collecting={collectingId === id}
                            preview={preview}
                            onMethodChange={(value) =>
                              setCollectMethodByJob((prev) => ({
                                ...prev,
                                [id]: value,
                              }))
                            }
                            onCollect={() => collectJob(job, method)}
                          />
                        ) : job.split ? (
                          <ShareLedgerButton split={job.split} />
                        ) : null}
                      </td>
                      <td>
                        <div>{job.status || job.trackStatus || "—"}</div>
                        {job.technicianName ? (
                          <div className="partner-tech">
                            Tech: {job.technicianName}
                            {job.technicianMobile ? ` · ${job.technicianMobile}` : ""}
                          </div>
                        ) : null}
                        {String(job.trackStatus || "").toLowerCase() ===
                          "requested" ||
                        job.partnerConfirmStatus === "pending" ? (
                          <div className="partner-decide">
                            <button
                              type="button"
                              className="partner-accept"
                              disabled={collectingId === id}
                              onClick={() => decideJob(job, "accept")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="partner-decline"
                              disabled={collectingId === id}
                              onClick={() => decideJob(job, "decline")}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                        {isDiagnosticKind(kind) &&
                        job.partnerConfirmed &&
                        String(job.trackStatus || "") !== "done" &&
                        String(job.trackStatus || "") !== "declined" ? (
                          <DiagnosticJobPanel
                            job={job}
                            busy={collectingId === id}
                            onAdvance={(fields) => advanceDiagnostic(job, fields)}
                          />
                        ) : null}
                        {job.reportFileName ? (
                          <p className="partner-report-note">
                            Report: {job.reportFileName}
                          </p>
                        ) : null}
                      </td>
                      {showScanCol ? (
                        <td>
                          <a
                            className="partner-scan-link"
                            href={scanHref({ id, step: "pickup", order: job })}
                          >
                            Scan Delivery
                          </a>
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

function DiagnosticJobPanel({ job, busy, onAdvance }) {
  const action = nextDiagnosticAction(job);
  const [techName, setTechName] = useState(job.technicianName || job.partnerName || "");
  const [techMobile, setTechMobile] = useState(job.technicianMobile || job.partnerMobile || "");
  const [reportName, setReportName] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [localError, setLocalError] = useState("");

  if (!action || action === "confirm") return null;

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });

  const submitReport = async () => {
    setLocalError("");
    if (!reportFile) {
      setLocalError("Choose a PDF or image report.");
      return;
    }
    if (reportFile.size > 1.5 * 1024 * 1024) {
      setLocalError("Report must be under 1.5 MB.");
      return;
    }
    try {
      const data = await readFile(reportFile);
      const tests = Array.isArray(job.tests)
        ? job.tests.map((row) => row?.name).filter(Boolean).join(", ")
        : "";
      onAdvance(
        reportReadyFields({
          fileName: reportFile.name,
          fileType: reportFile.type || "application/octet-stream",
          fileData: data,
          testName: reportName || tests || "Diagnostic report",
          notes: reportNotes,
        })
      );
    } catch (err) {
      setLocalError(err.message || "Could not upload report.");
    }
  };

  return (
    <div className="partner-diag-panel">
      {action === "assign_technician" ? (
        <>
          <p className="partner-collect-title">Assign technician</p>
          <input
            value={techName}
            onChange={(event) => setTechName(event.target.value)}
            placeholder="Technician name"
            disabled={busy}
          />
          <input
            value={techMobile}
            onChange={(event) => setTechMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Mobile"
            inputMode="numeric"
            disabled={busy}
          />
          <button
            type="button"
            className="partner-accept"
            disabled={busy || techName.trim().length < 2}
            onClick={() =>
              onAdvance(assignTechnicianFields({ name: techName, mobile: techMobile }))
            }
          >
            Assign Technician
          </button>
        </>
      ) : null}

      {action === "sample_collect" ? (
        <button
          type="button"
          className="partner-accept"
          disabled={busy}
          onClick={() => onAdvance(sampleCollectedFields())}
        >
          Mark Sample Collected
        </button>
      ) : null}

      {action === "collect_payment" ? (
        <p className="partner-report-note">Collect payment in the Split column, then upload the report.</p>
      ) : null}

      {action === "upload_report" ? (
        <>
          <p className="partner-collect-title">Upload report</p>
          <input
            value={reportName}
            onChange={(event) => setReportName(event.target.value)}
            placeholder="Test name on report"
            disabled={busy}
          />
          <input
            value={reportNotes}
            onChange={(event) => setReportNotes(event.target.value)}
            placeholder="Notes (optional)"
            disabled={busy}
          />
          <input
            type="file"
            accept="application/pdf,image/*"
            disabled={busy}
            onChange={(event) => setReportFile(event.target.files?.[0] || null)}
          />
          {localError ? <small className="admin-error">{localError}</small> : null}
          <button
            type="button"
            className="partner-accept"
            disabled={busy}
            onClick={submitReport}
          >
            Upload Report
          </button>
        </>
      ) : null}

      {action === "complete" ? (
        <button
          type="button"
          className="partner-accept"
          disabled={busy}
          onClick={() => onAdvance(diagnosticCompleteFields())}
        >
          Mark Completed
        </button>
      ) : null}
    </div>
  );
}

function PartnerCollectPanel({
  jobId,
  method,
  collecting,
  preview,
  onMethodChange,
  onCollect,
}) {
  const options = useMemo(
    () =>
      PAYMENT_METHOD_OPTIONS.map((option) => ({
        ...option,
        label: option.value === "cod" ? "Cash / COD" : option.label,
      })),
    []
  );

  return (
    <div className="partner-collect-panel">
      <p className="partner-collect-title">Collect payment</p>
      <div className="partner-pay-methods" role="radiogroup" aria-label="Collection method">
        {options.map((option) => (
          <label
            key={`${jobId}-${option.value}`}
            className={method === option.value ? "is-on" : ""}
          >
            <input
              type="radio"
              name={`partner-pay-${jobId}`}
              checked={method === option.value}
              onChange={() => onMethodChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {preview ? (
        <ul className="partner-split-preview">
          <li>
            <span>Collect from customer</span>
            <strong>{formatRupee(preview.payableRupees)}</strong>
          </li>
          <li>
            <span>Your share ({preview.partnerPercent}% MRP)</span>
            <strong>{formatRupee(preview.partnerTransferRupees)}</strong>
          </li>
          <li>
            <span>MediHome share</span>
            <strong>{formatRupee(preview.platformSettledRupees)}</strong>
          </li>
          <li>
            <span>Settlement</span>
            <strong>
              {preview.splitMode === "reverse" && preview.collection === "cash"
                ? `Due to MediHome ${formatRupee(preview.dueFromPartnerRupees)}`
                : preview.splitMode === "reverse"
                  ? "Reverse split · accounts credited"
                  : splitModeLabel(preview)}
            </strong>
          </li>
        </ul>
      ) : null}
      <button
        type="button"
        className="partner-collect-submit"
        disabled={collecting}
        onClick={onCollect}
      >
        {collecting
          ? "Recording…"
          : `Confirm ${
              method === "cod" ? "cash" : paymentMethodLabel(method)
            } collection`}
      </button>
    </div>
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
.partner-split-box{margin:0 0 8px;font-size:12px;line-height:1.4;color:#34546b}
.partner-split-box p{margin:0 0 4px}
.partner-collect-panel{margin-top:8px;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd}
.partner-collect-title{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1a6b7a}
.partner-pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.partner-pay-methods label{display:flex;align-items:center;gap:6px;margin:0;padding:7px 8px;min-height:36px;border:1px solid #e4ecef;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:700;color:#143246}
.partner-pay-methods label.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.partner-pay-methods input{width:14px;height:14px;margin:0;accent-color:#1a6b7a;flex:0 0 14px}
.partner-split-preview{list-style:none;margin:8px 0;padding:8px 0 0;border-top:1px solid #e4ecef}
.partner-split-preview li{display:flex;justify-content:space-between;gap:10px;margin:0;padding:3px 0;font-size:12px;color:#34546b}
.partner-split-preview strong{color:#143246;text-align:right}
.partner-collect-submit{width:100%;margin-top:4px;border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:36px;padding:8px 10px;cursor:pointer}
.partner-collect-submit:disabled{opacity:.65;cursor:wait}
.partner-decide{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.partner-accept,.partner-decline{border:0;border-radius:6px;font:inherit;font-size:12px;font-weight:800;min-height:32px;padding:6px 10px;cursor:pointer}
.partner-accept{background:#1a6b7a;color:#fff}
.partner-decline{background:#fff;color:#b64b4b;border:1px solid #e2bcbc}
.partner-accept:disabled,.partner-decline:disabled{opacity:.65;cursor:wait}
.partner-diag-panel{margin-top:8px;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd;display:grid;gap:6px}
.partner-diag-panel input{width:100%;box-sizing:border-box;min-height:34px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:12px}
.partner-tech,.partner-report-note{margin:4px 0 0;font-size:12px;color:#34546b;font-weight:700}
.partner-scan-link{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 8px;border-radius:6px;background:#1a6b7a;color:#fff;font-size:12px;font-weight:700;text-decoration:none}
.admin-login{max-width:420px}
.admin-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.admin-error{grid-column:1/-1;color:#d84b4b;font-size:13px}
.admin-table-wrap{overflow:auto;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.admin-table{width:100%;border-collapse:collapse;font-size:13px}
.admin-table th,.admin-table td{padding:8px 10px;border-bottom:1px solid #edf1f3;text-align:left;vertical-align:top}
.admin-table th{background:#f7fafc;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.partner-page .service-hero h1{margin:0 0 4px;font-size:22px}
.partner-page .service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.partner-page .service-hero{margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.partner-page .service-form{display:grid;grid-template-columns:1fr;gap:10px;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.partner-page .field{display:flex;flex-direction:column}
.partner-page label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.partner-page input,.partner-page .service-submit{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
.partner-page .service-submit{border:none;background:#1a6b7a;color:#fff;font-weight:700;min-height:40px;cursor:pointer}
@media (max-width:800px){.admin-hero{flex-direction:column}.partner-pay-methods{grid-template-columns:1fr}}
`;
