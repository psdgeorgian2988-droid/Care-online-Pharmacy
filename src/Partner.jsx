import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { splitPayment } from "./paymentSplit";
import { groupOrdersByKind } from "./orderStatus";
import {
  PAYMENT_METHOD_OPTIONS,
  isOnlinePayment,
  paymentMethodLabel,
  paymentShareText,
  paymentUpiUri,
} from "./paymentMethods";
import { takeOnlinePayment } from "./paymentApi";
import {
  defaultSplitParts,
  normalizePaymentParts,
  orderPayableRupees,
  paidOnCustomerApp,
  paymentPartsTotal,
  splitCollectionError,
} from "./partnerCollect";
import { fileToPrescriptionDraft } from "./prescriptionDraft";
import {
  fetchPartnerJobs,
  partnerLogin,
  partnerLogout,
  partnerSession,
  patchPartnerJob,
} from "./partnerApi";
import { isMedicineRiderPartner, scanHref } from "./orderQr";
import { rxShareCardStyles } from "./RxShareCard";
import OrderFullView from "./OrderFullView.jsx";
import OrderListTable from "./OrderListTable.jsx";
import {
  acceptRequestedSlotFields,
  isAwaitingCustomerSlotConfirm,
  needsSlotConfirm,
  partnerAcceptFields,
  partnerDeclineFields,
  partnerOfferSlotFields,
} from "./orderConfirm";
import {
  LAB_TIME_SLOTS,
  PSY_TIME_SLOTS,
  appointmentSlotError,
  bookingMaxDate,
  openAppointmentSlots,
} from "./appointmentSlot";
import { isoDateToday } from "./personFields";
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
  const payable = orderPayableRupees(job);
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
  const [openJobId, setOpenJobId] = useState("");

  const loadJobs = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
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
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadJobs();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(() => {
      loadJobs({ quiet: true });
    }, 8000);
    return () => clearInterval(timer);
  }, [token]);

  const collectJob = async (
    job,
    { paymentMethod, splitCollection, paymentParts, receipt } = {}
  ) => {
    const id = job.id || job.bookingId || job.requestId;
    setCollectingId(id);
    setError("");
    try {
      let gateway = {};
      if (!splitCollection && isOnlinePayment(paymentMethod)) {
        const payable = orderPayableRupees(job);
        const paid = await takeOnlinePayment({
          amountRupees: payable,
          saleRupees: job.split?.saleRupees ?? payable,
          couponCode: job.split?.couponCode || job.couponCode || "",
          kind: job.kind || job.orderType || "medicine",
          pin: job.pinCode || job.pin || "",
          name: job.patientName || job.name || partner?.name || "",
          mobile: job.mobile || partner?.mobile || "",
          reference: id,
          description: `MediHome ${id}`,
          collector: "medihome",
          paymentMethod,
          paidOn: "customer",
        });
        gateway = {
          paymentId: paid.paymentId || "",
          razorpayPaymentId: paid.razorpayPaymentId || "",
        };
      }
      await patchPartnerJob(id, {
        collectPayment: true,
        paymentMethod,
        splitCollection: Boolean(splitCollection),
        paymentParts: splitCollection ? paymentParts : [],
        receipt,
        ...gateway,
      });
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

  const decideJob = async (job, decision, extras = {}) => {
    const id = job.id || job.bookingId || job.requestId;
    const kind = String(job.kind || job.orderType || job.serviceType || "").toLowerCase();
    setCollectingId(id);
    setError("");
    try {
      let fields;
      if (decision === "offer-slot") {
        fields = partnerOfferSlotFields({
          date: extras.date,
          timeSlot: extras.timeSlot,
          requestedDate: job.requestedDate || job.date,
          requestedTimeSlot: job.requestedTimeSlot || job.timeSlot,
        });
      } else if (decision === "accept" && needsSlotConfirm(kind)) {
        fields = acceptRequestedSlotFields(kind, job);
      } else if (decision === "accept") {
        fields = partnerAcceptFields();
      } else {
        fields = partnerDeclineFields();
      }
      await patchPartnerJob(id, {
        ...fields,
        status:
          decision === "accept" &&
          (job.paymentMethod === "pending" ||
            job.paymentStatus === "awaiting_partner")
            ? "Confirmed — payment pending"
            : fields.status,
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
        {groupOrdersByKind(
          jobs,
          Array.isArray(partner.kinds) && partner.kinds.length
            ? partner.kinds
            : undefined
        ).map((group) => (
          <section key={group.kind} className="order-category" aria-label={group.title}>
            <h2>{group.title}</h2>
            <OrderListTable
              orders={group.orders}
              audience="partner"
              empty={
                loading
                  ? "Loading…"
                  : `No ${group.title.toLowerCase()} yet.`
              }
              openId={openJobId}
              onOpen={setOpenJobId}
              renderDetail={(job) => {
                const id = job.id || job.bookingId || job.requestId;
                const paid =
                  String(job.paymentStatus || "").toLowerCase() === "paid";
                const paidElsewhere = paidOnCustomerApp(job);
                const needsCollect = !paid;
                const method = collectMethodByJob[id] || "qr";
                const kind = job.kind || job.orderType || "medicine";
                const preview = needsCollect
                  ? previewPartnerSplit(job, method)
                  : null;
                return (
                  <JobDetail
                    id={id}
                    job={job}
                    kind={kind}
                    paid={paid}
                    paidElsewhere={paidElsewhere}
                    needsCollect={needsCollect}
                    method={method}
                    preview={preview}
                    partner={partner}
                    collecting={collectingId === id}
                    showScanCol={showScanCol}
                    onMethodChange={(value) =>
                      setCollectMethodByJob((prev) => ({
                        ...prev,
                        [id]: value,
                      }))
                    }
                    onCollect={(payload) => collectJob(job, payload)}
                    onCorrectMedicine={async (med, name) => {
                      setCollectingId(id);
                      setError("");
                      try {
                        await patchPartnerJob(id, {
                          rxMedicineCorrection: {
                            id: med.id || med.name,
                            name,
                          },
                        });
                        await loadJobs();
                      } catch (err) {
                        setError(
                          err.message || "Could not correct the medicine name."
                        );
                        throw err;
                      } finally {
                        setCollectingId("");
                      }
                    }}
                    onAcceptRequested={() => decideJob(job, "accept")}
                    onOfferSlot={(slot) => decideJob(job, "offer-slot", slot)}
                    onDecline={() => decideJob(job, "decline")}
                    onAccept={() => decideJob(job, "accept")}
                    onAdvance={(fields) => advanceDiagnostic(job, fields)}
                  />
                );
              }}
            />
          </section>
        ))}
      </div>
    </>
  );
}

function JobDetail({
  id,
  job,
  kind,
  paid,
  paidElsewhere,
  needsCollect,
  method,
  preview,
  partner,
  collecting,
  showScanCol,
  onMethodChange,
  onCollect,
  onCorrectMedicine,
  onAcceptRequested,
  onOfferSlot,
  onDecline,
  onAccept,
  onAdvance,
}) {
  return (
    <div className="partner-job-detail-inner">
      <OrderFullView
        order={job}
        audience="partner"
        rxEditable
        rxBusy={collecting}
        onCorrectMedicine={onCorrectMedicine}
      />
      {needsCollect ? (
        <PartnerCollectPanel
          jobId={id}
          job={job}
          method={method}
          collecting={collecting}
          preview={preview}
          payable={orderPayableRupees(job)}
          partner={partner}
          onMethodChange={onMethodChange}
          onCollect={onCollect}
        />
      ) : paid ? (
        <PaidOnDesk job={job} paidElsewhere={paidElsewhere} />
      ) : null}
      {needsSlotConfirm(kind) &&
      (String(job.trackStatus || "").toLowerCase() === "requested" ||
        job.partnerConfirmStatus === "pending" ||
        job.partnerConfirmStatus === "slot_rejected" ||
        isAwaitingCustomerSlotConfirm(job)) ? (
        <PartnerSlotPanel
          job={job}
          kind={kind}
          busy={collecting}
          onAcceptRequested={onAcceptRequested}
          onOfferSlot={onOfferSlot}
          onDecline={onDecline}
        />
      ) : String(job.trackStatus || "").toLowerCase() === "requested" ||
        job.partnerConfirmStatus === "pending" ? (
        <div className="partner-decide">
          <button
            type="button"
            className="partner-accept"
            disabled={collecting}
            onClick={onAccept}
          >
            Accept
          </button>
          <button
            type="button"
            className="partner-decline"
            disabled={collecting}
            onClick={onDecline}
          >
            Decline
          </button>
        </div>
      ) : null}
      {isDiagnosticKind(kind) &&
      job.partnerConfirmed &&
      String(job.trackStatus || "") !== "done" &&
      String(job.trackStatus || "") !== "declined" ? (
        <DiagnosticJobPanel job={job} busy={collecting} onAdvance={onAdvance} />
      ) : null}
      {job.reportFileName ? (
        <p className="partner-report-note">Report: {job.reportFileName}</p>
      ) : null}
      {showScanCol ? (
        <p>
          <a
            className="partner-scan-link"
            href={scanHref({ id, step: "pickup", order: job })}
          >
            Scan Delivery
          </a>
        </p>
      ) : null}
    </div>
  );
}

function PartnerSlotPanel({ job, kind, busy, onAcceptRequested, onOfferSlot, onDecline }) {
  const requestedDate = job.requestedDate || job.date || "";
  const requestedSlot = job.requestedTimeSlot || job.timeSlot || "";
  const [date, setDate] = useState(requestedDate);
  const [timeSlot, setTimeSlot] = useState("");
  const [error, setError] = useState("");
  const waiting = isAwaitingCustomerSlotConfirm(job);
  const slots = kind === "psychologist" ? PSY_TIME_SLOTS : LAB_TIME_SLOTS;
  const openSlots = openAppointmentSlots(slots, date);
  const today = isoDateToday();
  const maxDate = bookingMaxDate();
  const title = kind === "psychologist" ? "Psychologist slot" : "Imaging slot";

  const offer = () => {
    const slotError = appointmentSlotError(timeSlot, date, slots);
    if (slotError) {
      setError(slotError);
      return;
    }
    if (
      date === requestedDate &&
      timeSlot === requestedSlot
    ) {
      setError("Pick a different available slot, or accept the customer’s requested slot.");
      return;
    }
    setError("");
    onOfferSlot({ date, timeSlot });
  };

  return (
    <div className="partner-diag-panel">
      <p className="partner-collect-title">{title}</p>
      <p className="partner-tech">
        Customer requested: {requestedDate || "—"} · {requestedSlot || "—"}
      </p>
      {job.partnerConfirmStatus === "slot_rejected" ? (
        <p className="partner-tech">Customer declined the last offered slot. Offer another or decline.</p>
      ) : null}
      {waiting ? (
        <p className="partner-tech">
          Offered {job.offeredDate} · {job.offeredTimeSlot}. Waiting for customer confirmation.
        </p>
      ) : (
        <>
          <label className="partner-slot-label">
            Available date
            <input
              type="date"
              value={date}
              min={today}
              max={maxDate}
              disabled={busy}
              onChange={(event) => {
                setDate(event.target.value);
                setTimeSlot("");
                setError("");
              }}
            />
          </label>
          <label className="partner-slot-label">
            Available slot
            <select
              value={timeSlot}
              disabled={busy}
              onChange={(event) => {
                setTimeSlot(event.target.value);
                setError("");
              }}
            >
              <option value="">Select an open slot</option>
              {openSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="admin-error">{error}</p> : null}
          <div className="partner-decide">
            <button
              type="button"
              className="partner-accept"
              disabled={busy || !requestedSlot}
              onClick={onAcceptRequested}
            >
              Accept requested slot
            </button>
            <button
              type="button"
              className="partner-accept"
              disabled={busy}
              onClick={offer}
            >
              Offer this slot
            </button>
            <button
              type="button"
              className="partner-decline"
              disabled={busy}
              onClick={onDecline}
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
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

  if (action === "await_customer_slot") {
    return (
      <p className="partner-tech">
        Waiting for the customer to accept the offered slot
        {job.offeredDate || job.offeredTimeSlot
          ? ` (${[job.offeredDate, job.offeredTimeSlot].filter(Boolean).join(" · ")})`
          : ""}
        .
      </p>
    );
  }

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
          <p className="partner-collect-title">Assign partner</p>
          <input
            value={techName}
            onChange={(event) => setTechName(event.target.value)}
            placeholder="Partner name"
            aria-label="Partner name"
            disabled={busy}
          />
          <input
            value={techMobile}
            onChange={(event) => setTechMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Mobile"
            aria-label="Partner mobile"
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
            Assign Partner
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
        <p className="partner-report-note">Collect payment in the Collection column, then upload the report.</p>
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

function PaidOnDesk({ job, paidElsewhere }) {
  const method = paymentMethodLabel(job.paymentMethod, "Cash / COD");
  return (
    <div className="partner-paid-box">
      <p className="partner-collect-title">
        {job.trackCompleted ? "Collected · order completed" : "Payment received"}
      </p>
      <p className="partner-report-note">
        {paidElsewhere
          ? `Paid on MediHome (${method}). Split follows the agreed rule.`
          : `Collected by partner (${method}).`}
      </p>
      {job.receiptFileData ? (
        <img
          className="partner-receipt-preview"
          src={job.receiptFileData}
          alt="Payment receipt"
        />
      ) : null}
    </div>
  );
}

function PartnerCollectPanel({
  jobId,
  job,
  method,
  collecting,
  preview,
  payable,
  partner,
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
  const [splitOn, setSplitOn] = useState(false);
  const [parts, setParts] = useState(() => defaultSplitParts(payable));
  const [qrSrc, setQrSrc] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptErrorText, setReceiptErrorText] = useState("");
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    setSplitOn(false);
    setParts(defaultSplitParts(payable));
    setReceipt(null);
    setReceiptErrorText("");
    setShareNote("");
  }, [jobId, payable]);

  const payUri = paymentUpiUri({
    amount: payable,
    kind: job?.kind || job?.orderType || "order",
    orderId: jobId,
    pa: partner?.upiId,
    pn: partner?.name || "MediHome",
  });

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payUri, {
      margin: 1,
      width: 196,
      color: { dark: "#143246", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url);
      })
      .catch(() => {
        if (!cancelled) setQrSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [payUri]);

  const attachReceipt = async (file) => {
    setReceiptErrorText("");
    if (!file) {
      setReceipt(null);
      return;
    }
    try {
      const draft = await fileToPrescriptionDraft(file);
      if (!String(draft.fileType || "").startsWith("image/")) {
        setReceipt(null);
        setReceiptErrorText("Take a photo of the receipt.");
        return;
      }
      setReceipt({
        fileName: draft.fileName,
        fileType: draft.fileType,
        fileData: draft.fileData,
        capturedAt: Date.now(),
      });
    } catch (err) {
      setReceipt(null);
      setReceiptErrorText(err.message || "Could not read that photo.");
    }
  };

  const shareQr = async () => {
    const text = paymentShareText({ amount: payable, kind: job?.kind || "order" });
    try {
      if (qrSrc && navigator.share) {
        await navigator.share({ title: "MediHome payment QR", text: `${text}\n${payUri}` });
        setShareNote("QR shared.");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${payUri}`);
      setShareNote("Payment link copied.");
    } catch {
      setShareNote("Show the QR on this screen.");
    }
  };

  const remaining = roundRemaining(payable, parts);
  const splitError = splitOn ? splitCollectionError(parts, payable) : "";

  const patchPart = (index, next) => {
    setParts((prev) => {
      const list = prev.map((row, i) => (i === index ? { ...row, ...next } : row));
      if (next.amountRupees !== undefined) {
        const other = index === 0 ? 1 : 0;
        const typed = Number(next.amountRupees);
        if (
          Number.isFinite(typed) &&
          typed >= 0 &&
          (list[other].amountRupees === "" || list[other].amountRupees == null)
        ) {
          const leftover = Math.max(0, Math.round((Number(payable) - typed) * 100) / 100);
          list[other] = { ...list[other], amountRupees: leftover };
        }
      }
      return list;
    });
  };

  return (
    <div className="partner-collect-panel">
      <p className="partner-collect-title">Collect payment</p>
      <div className="partner-pay-qr">
        {qrSrc ? (
          <img src={qrSrc} alt={`Payment QR for ${jobId}`} />
        ) : (
          <p className="partner-split-left">Preparing QR…</p>
        )}
        <p>Customer scans this QR for {formatRupee(payable)}. The agreed split is applied automatically.</p>
        <button type="button" className="partner-qr-share" onClick={shareQr}>
          Share QR
        </button>
        {shareNote ? <small>{shareNote}</small> : null}
      </div>
      <label className={`partner-split-toggle${splitOn ? " is-on" : ""}`}>
        <input
          type="checkbox"
          checked={splitOn}
          onChange={(event) => setSplitOn(event.target.checked)}
        />
        <span>Split payment</span>
      </label>
      {splitOn ? (
        <div className="partner-split-rows">
          {parts.map((part, index) => (
            <div key={`${jobId}-split-${index}`} className="partner-split-row">
              <label>
                Method {index + 1}
                <select
                  value={part.method}
                  aria-label={`Split method ${index + 1}`}
                  onChange={(event) => patchPart(index, { method: event.target.value })}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount
                <input
                  inputMode="decimal"
                  aria-label={`Split amount ${index + 1}`}
                  value={part.amountRupees}
                  placeholder="0"
                  onChange={(event) =>
                    patchPart(index, {
                      amountRupees: event.target.value.replace(/[^\d.]/g, ""),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <p className={remaining === 0 && !splitError ? "partner-split-ok" : "partner-split-left"}>
            {splitError ||
              (remaining === 0
                ? `Split totals ${formatRupee(paymentPartsTotal(parts))}`
                : `Remaining ${formatRupee(remaining)}`)}
          </p>
        </div>
      ) : (
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
      )}
      {preview ? (
        <ul className="partner-split-preview">
          <li>
            <span>Collect from customer</span>
            <strong>{formatRupee(preview.payableRupees)}</strong>
          </li>
        </ul>
      ) : null}
      <label className="partner-receipt-field">
        Receipt photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={collecting}
          onChange={(event) => attachReceipt(event.target.files?.[0] || null)}
        />
      </label>
      {receipt?.fileData ? (
        <img className="partner-receipt-preview" src={receipt.fileData} alt="Receipt preview" />
      ) : (
        <p className="partner-receipt-hint">
          {isOnlinePayment(method)
            ? "Digital payment opens the secure gateway. A receipt photo is optional."
            : "Take a photo of the cash receipt to confirm collection."}
        </p>
      )}
      {receiptErrorText ? <p className="partner-split-left">{receiptErrorText}</p> : null}
      <button
        type="button"
        className="partner-collect-submit"
        disabled={
          collecting ||
          (splitOn && Boolean(splitError)) ||
          (!isOnlinePayment(method) && !splitOn && !receipt)
        }
        onClick={() =>
          onCollect(
            splitOn
              ? {
                  paymentMethod: "split",
                  splitCollection: true,
                  paymentParts: normalizePaymentParts(parts),
                  receipt,
                }
              : { paymentMethod: method, receipt }
          )
        }
      >
        {collecting
          ? "Recording…"
          : splitOn
            ? "Confirm split collection"
            : isOnlinePayment(method)
              ? `Pay ${paymentMethodLabel(method)} via gateway`
              : `Confirm ${
                  method === "cod" ? "cash" : paymentMethodLabel(method)
                } collection`}
      </button>
    </div>
  );
}

function roundRemaining(payable, parts) {
  return Math.round((Number(payable || 0) - paymentPartsTotal(parts)) * 100) / 100;
}

const styles = `
${rxShareCardStyles}
.partner-page{max-width:1240px}
.partner-job-detail td{background:#f7fbfd;border-bottom:8px solid #eef3f6}
.admin-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.admin-hero-actions{display:flex;flex-wrap:wrap;gap:6px}
.admin-hero-actions button{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer}
.partner-split-box{margin:0 0 8px;font-size:12px;line-height:1.4;color:#34546b}
.partner-split-box p{margin:0 0 4px}
.partner-collect-panel{margin-top:8px;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd}
.partner-pay-qr{display:grid;justify-items:center;gap:6px;margin:0 0 10px;padding:10px;border:1px dashed #c5d6e0;border-radius:10px;background:#fff;text-align:center}
.partner-pay-qr img{width:168px;height:168px;background:#fff}
.partner-pay-qr p{margin:0;max-width:36ch;font-size:12px;line-height:1.4;color:#34546b}
.partner-qr-share{border:1px solid #1a6b7a;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:32px;padding:6px 10px;cursor:pointer}
.partner-receipt-field{display:flex;flex-direction:column;gap:4px;margin:8px 0 4px;font-size:11px;font-weight:700;color:#34546b}
.partner-receipt-field input{font:inherit}
.partner-receipt-preview{width:100%;max-height:180px;object-fit:contain;border:1px solid #d7e2e9;border-radius:8px;background:#fff;margin:4px 0}
.partner-receipt-hint,.partner-paid-box p{margin:0 0 6px;font-size:12px;line-height:1.4;color:#34546b}
.partner-paid-box{margin-top:8px;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd}
.partner-collect-title{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1a6b7a}
.partner-split-toggle{display:flex;align-items:center;gap:8px;margin:0 0 8px;padding:8px 10px;border:1px dashed #c5d6e0;border-radius:8px;background:#fff;font-size:12px;font-weight:800;color:#143246;cursor:pointer}
.partner-split-toggle.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.partner-split-toggle input{width:16px;height:16px;margin:0;accent-color:#1a6b7a}
.partner-split-rows{display:grid;gap:8px}
.partner-split-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.partner-split-row label{display:flex;flex-direction:column;gap:4px;margin:0;font-size:11px;font-weight:700;color:#34546b}
.partner-split-row select,.partner-split-row input{width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:13px;background:#fff}
.partner-split-left,.partner-split-ok{margin:0;font-size:12px;font-weight:700}
.partner-split-left{color:#b64b4b}
.partner-split-ok{color:#0f7a4a}
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
.partner-diag-panel input,.partner-diag-panel select{width:100%;box-sizing:border-box;min-height:34px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:12px}
.partner-slot-label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#34546b}
.partner-tech,.partner-report-note{margin:4px 0 0;font-size:12px;color:#34546b;font-weight:700}
.partner-scan-link{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 8px;border-radius:6px;background:#1a6b7a;color:#fff;font-size:12px;font-weight:700;text-decoration:none}
.admin-login{max-width:420px}
.admin-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.admin-error{grid-column:1/-1;color:#d84b4b;font-size:13px}
.order-category{margin:0 0 16px}
.order-category h2{margin:0 0 8px;font-size:15px;color:#143246}
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
@media (max-width:800px){.admin-hero{flex-direction:column}.partner-pay-methods,.partner-split-row{grid-template-columns:1fr}}
`;
