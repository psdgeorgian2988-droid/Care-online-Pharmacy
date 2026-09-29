import { useEffect, useMemo, useState } from "react";
import {
  STEPDOWN_DESK_TABS,
  STEPDOWN_LIST_TABS,
  downloadStepdownDocument,
  isStepdownAdmitted,
  isStepdownDischarged,
  isStepdownImageFile,
  isStepdownPaid,
  ordersForStepdownListTab,
  printStepdownDocument,
  stepdownBookingDecision,
  stepdownDeskField,
  stepdownFileObjectUrl,
} from "./stepdownDesk";
import { orderRecordId } from "./orderFullFields";
import StepdownBillingPanel from "./StepdownBillingPanel.jsx";
import StepdownDischargePay from "./StepdownDischargePay.jsx";

function stepdownBookingId(order) {
  return String(order?.bookingId || orderRecordId(order) || "").trim();
}

export default function StepDownDesk({
  orders = [],
  loading = false,
  decidingId = "",
  partner,
  onDecide,
  onAdmit,
  onDischarge,
  onBillUpdate,
}) {
  const rows = Array.isArray(orders) ? orders : [];
  const [listTab, setListTab] = useState("new");
  const [openId, setOpenId] = useState("");
  const [openFile, setOpenFile] = useState(null);
  const [settlingId, setSettlingId] = useState("");
  const tabRows = useMemo(
    () => ordersForStepdownListTab(rows, listTab),
    [rows, listTab]
  );
  const openOrder =
    rows.find((order) => stepdownBookingId(order) === openId || orderRecordId(order) === openId) ||
    null;
  const settling =
    Boolean(openOrder) &&
    (settlingId === stepdownBookingId(openOrder) || settlingId === orderRecordId(openOrder));

  useEffect(() => {
    setSettlingId("");
  }, [openId]);

  return (
    <section className="order-category" aria-label="Step-down centre">
      <style>{styles}</style>
      <div className="lab-tabs partner-order-tabs sd-list-tabs" role="tablist" aria-label="Booking status">
        {STEPDOWN_LIST_TABS.map((tab) => {
          const count = ordersForStepdownListTab(rows, tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={listTab === tab.id ? "is-on" : ""}
              onClick={() => {
                setListTab(tab.id);
                setOpenId("");
              }}
            >
              {tab.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>
      {openFile ? (
        <FileViewer
          file={openFile.file}
          title={openFile.title}
          kind={openFile.kind}
          onClose={() => setOpenFile(null)}
        />
      ) : null}
      {openOrder ? (
        <article className="sd-booking">
          <div className="sd-booking-decide">
            <button type="button" className="sd-back" onClick={() => setOpenId("")}>
              {STEPDOWN_LIST_TABS.find((tab) => tab.id === listTab)?.label || "New Booking"}
            </button>
            <strong className="sd-booking-id">{stepdownBookingId(openOrder)}</strong>
            <BookingDecision
              order={openOrder}
              deciding={decidingId === orderRecordId(openOrder)}
              onDecide={(order, decision) => {
                onDecide?.(order, decision);
                if (decision === "accept") setListTab("accepted");
              }}
              onAdmit={(order, extras) => {
                onAdmit?.(order, extras);
                setListTab("admitted");
              }}
              settling={settling && listTab === "admitted"}
            />
          </div>
          <div className="sd-desk-cols" role="row">
            {STEPDOWN_DESK_TABS.map((item) => (
              <div key={item.id} className="sd-col-tab" role="columnheader">
                {item.label}
              </div>
            ))}
          </div>
          <div className="sd-desk-cols sd-booking-values" role="row">
            {STEPDOWN_DESK_TABS.map((item) => (
              <div
                key={`${orderRecordId(openOrder)}-${item.id}`}
                className="sd-col-value"
                data-tab={item.id}
              >
                <FieldValue
                  tabId={item.id}
                  order={openOrder}
                  onOpenFile={setOpenFile}
                />
              </div>
            ))}
          </div>
          {isStepdownAdmitted(openOrder) || isStepdownDischarged(openOrder) ? (
            <>
              <div className="sd-admit-facts">
                <p>
                  <span>Room No</span>
                  <strong>{openOrder.roomNo || "—"}</strong>
                </p>
                <p>
                  <span>Bed No</span>
                  <strong>{openOrder.bedNo || "—"}</strong>
                </p>
                {isStepdownAdmitted(openOrder) && listTab === "admitted" && !settling ? (
                  <button
                    type="button"
                    className="sd-discharge-btn"
                    disabled={decidingId === orderRecordId(openOrder)}
                    onClick={() => {
                      setSettlingId(orderRecordId(openOrder) || stepdownBookingId(openOrder));
                    }}
                  >
                    Discharge
                  </button>
                ) : null}
              </div>
              {isStepdownAdmitted(openOrder) && listTab === "admitted" && !settling ? (
                <StepdownBillingPanel
                  order={openOrder}
                  canEdit
                  busy={decidingId === orderRecordId(openOrder)}
                  addedBy={openOrder.inchargeName || ""}
                  onAddCharge={(fields) => onBillUpdate?.(openOrder, fields)}
                />
              ) : null}
              {isStepdownAdmitted(openOrder) && listTab === "admitted" && settling ? (
                <StepdownDischargePay
                  order={openOrder}
                  partner={partner}
                  busy={decidingId === orderRecordId(openOrder)}
                  canPay
                  autoOpenBill
                  onCollect={(extras) => {
                    onDischarge?.(openOrder, extras);
                    setListTab("discharged");
                    setSettlingId("");
                  }}
                />
              ) : null}
              {isStepdownDischarged(openOrder) && listTab === "discharged" ? (
                <StepdownDischargePay
                  order={openOrder}
                  partner={partner}
                  canPay={false}
                />
              ) : null}
            </>
          ) : null}
        </article>
      ) : (
        <div className="sd-id-list">
          <p className="sd-id-kicker">Booking ID</p>
          {tabRows.length === 0 ? (
            <p className="sd-desk-empty">
              {loading
                ? "Loading…"
                : listTab === "new"
                  ? "No new bookings."
                  : "No bookings in this tab."}
            </p>
          ) : (
            <ul>
              {tabRows.map((order) => {
                const id = stepdownBookingId(order);
                return (
                  <li key={orderRecordId(order)}>
                    <button type="button" onClick={() => setOpenId(id)}>
                      {id || "Booking"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function FieldValue({ tabId, order, onOpenFile }) {
  const value = stepdownDeskField(order, tabId);
  if (tabId === "discharge" || tabId === "prescription") {
    const hasFile = Boolean(value?.href || value?.name);
    const icon =
      tabId === "discharge" ? (
        <DischargeFileIcon />
      ) : (
        <PrescriptionFileIcon />
      );
    if (value?.href) {
      const label = tabId === "discharge" ? "discharge summary" : "prescription";
      const open = () =>
        onOpenFile?.({
          file: value,
          title: label,
          kind: tabId,
        });
      return (
        <div className="sd-file-actions">
          <button
            type="button"
            className={`sd-file-icon is-${tabId}`}
            aria-label={`Open ${label}`}
            onClick={open}
          >
            {icon}
          </button>
        </div>
      );
    }
    return hasFile ? (
      <span className={`sd-file-icon is-${tabId} is-plain`} aria-hidden="true">
        {icon}
      </span>
    ) : (
      "—"
    );
  }
  return value || "—";
}

function FileViewer({ file, title, kind, onClose }) {
  const heading = kind === "prescription" ? "Prescription" : "Discharge Summary";
  const isImage = isStepdownImageFile(file);
  const src = useMemo(() => stepdownFileObjectUrl(file), [file]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    };
  }, [src, onClose]);

  return (
    <div className="sd-file-viewer" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="sd-file-viewer-bar">
        <strong>{heading}</strong>
        <div className="sd-file-viewer-actions">
          <button
            type="button"
            className="sd-file-viewer-print"
            onClick={() => printStepdownDocument(file, title)}
          >
            Print
          </button>
          <button
            type="button"
            className="sd-file-viewer-save"
            onClick={() => downloadStepdownDocument(file, title)}
          >
            Save to device
          </button>
          <button type="button" className="sd-file-viewer-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="sd-file-viewer-body">
        {src ? (
          isImage ? (
            <img src={src} alt={heading} />
          ) : (
            <iframe title={heading} src={src} />
          )
        ) : (
          <p>Opening file…</p>
        )}
      </div>
    </div>
  );
}

function DischargeFileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#e8f4f7" stroke="#1a6b7a" strokeWidth="1.6" />
      <path d="M8 8h8M8 11.5h8M8 15h5" stroke="#1a6b7a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16.5" cy="16.5" r="3.4" fill="#1a6b7a" />
      <path d="M16.5 14.8v3.4M14.8 16.5h3.4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PrescriptionFileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="13" height="18" rx="2" fill="#fff4e8" stroke="#c06a1a" strokeWidth="1.6" />
      <path d="M7 8h7M7 11.5h7M7 15h4" stroke="#c06a1a" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="13" width="7" height="8" rx="1.5" fill="#c06a1a" />
      <text x="16.5" y="19.1" textAnchor="middle" fill="#fff" fontSize="6.2" fontWeight="800">
        Rx
      </text>
    </svg>
  );
}

function AdmitShiftForm({ order, deciding, onAdmit }) {
  const [roomNo, setRoomNo] = useState(order?.roomNo || "");
  const [bedNo, setBedNo] = useState(order?.bedNo || "");
  const [error, setError] = useState("");

  const submit = () => {
    const room = String(roomNo || "").trim();
    const bed = String(bedNo || "").trim();
    if (!room || !bed) {
      setError("Enter Room No and Bed No to admit the patient.");
      return;
    }
    setError("");
    onAdmit?.(order, { roomNo: room, bedNo: bed });
  };

  return (
    <div className="sd-admit-form">
      <strong className="sd-decision is-yes">Booking Accepted</strong>
      <label>
        Room No
        <input
          value={roomNo}
          disabled={deciding}
          onChange={(event) => setRoomNo(event.target.value)}
        />
      </label>
      <label>
        Bed No
        <input
          value={bedNo}
          disabled={deciding}
          onChange={(event) => setBedNo(event.target.value)}
        />
      </label>
      <button type="button" className="sd-decide-yes" disabled={deciding} onClick={submit}>
        {deciding ? "Saving…" : "Shift Patient"}
      </button>
      {error ? <p className="sd-admit-error">{error}</p> : null}
    </div>
  );
}

function BookingDecision({
  order,
  deciding,
  settling,
  onDecide,
  onAdmit,
}) {
  const decision = stepdownBookingDecision(order);
  if (decision === "cancelled") {
    const remitted = Number(order?.remitRupees || 0);
    const percent = Number(order?.remitPercent);
    return (
      <strong className="sd-decision is-cancel">
        Cancelled
        {remitted > 0
          ? ` · ${Number.isFinite(percent) ? `${percent}% ` : ""}advance remitted ₹${remitted.toLocaleString("en-IN")}`
          : " · no advance remitted"}
      </strong>
    );
  }
  if (isStepdownDischarged(order)) {
    return (
      <strong className="sd-decision is-yes">
        {isStepdownPaid(order) ? "Discharged · Paid" : "Discharged"}
      </strong>
    );
  }
  if (isStepdownAdmitted(order)) {
    return (
      <strong className="sd-decision is-yes">{settling ? "Complete bill" : "Admitted"}</strong>
    );
  }
  if (decision === "confirmed") {
    return (
      <AdmitShiftForm order={order} deciding={deciding} onAdmit={onAdmit} />
    );
  }
  if (decision === "unavailable") {
    return <strong className="sd-decision is-no">Not Available</strong>;
  }
  return (
    <div className="sd-decide">
      <button
        type="button"
        className="sd-decide-yes"
        disabled={deciding}
        onClick={() => onDecide?.(order, "accept")}
      >
        {deciding ? "Saving…" : "Confirm"}
      </button>
      <button
        type="button"
        className="sd-decide-no"
        disabled={deciding}
        onClick={() => onDecide?.(order, "decline")}
      >
        Not Available
      </button>
    </div>
  );
}

const styles = `
.sd-desk-table{overflow-x:auto}
.sd-desk-cols{
  display:grid;
  grid-template-columns:repeat(7,minmax(120px,1fr));
  gap:8px;
  align-items:stretch;
  min-width:900px;
}
.sd-col-tab{
  border:0;
  background:#e8f1f6;
  color:#1a6b7a;
  font:inherit;
  font-size:12px;
  font-weight:800;
  padding:10px 8px;
  border-radius:8px;
  text-align:center;
  line-height:1.25;
}
.sd-list-tabs{display:flex;flex-wrap:wrap;margin:0 0 12px;padding:4px;border-radius:10px;background:#e8f1f6;gap:4px}
.sd-list-tabs button{border:0;background:transparent;color:#3d5a6c;font:inherit;font-size:13px;font-weight:700;padding:8px 12px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.sd-list-tabs button.is-on{background:#fff;color:#1a6b7a;box-shadow:0 1px 3px rgba(20,50,70,.08)}
.sd-list-tabs span{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#1a6b7a;color:#fff;font-size:11px;line-height:18px;text-align:center}
.sd-id-list{margin:8px 0 0;padding:12px;border:1px solid #e4ecef;border-radius:12px;background:#fff}
.sd-id-kicker{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#1a6b7a}
.sd-id-list ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.sd-id-list button{width:100%;text-align:left;border:1px solid #d7e2e9;background:#f7fbfd;color:#1a6b7a;border-radius:8px;font:inherit;font-size:14px;font-weight:800;padding:10px 12px;cursor:pointer}
.sd-id-list button:hover{background:#e8f4f6}
.sd-desk-empty{margin:12px 0;color:#5d7180;font-size:14px}
.sd-booking{margin:10px 0 0;padding:10px;border:1px solid #e4ecef;border-radius:12px;background:#fff}
.sd-booking-decide{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.sd-booking-id{font-size:15px;color:#143246}
.sd-back{border:1px solid #c5d6de;background:#fff;color:#1a6b7a;border-radius:8px;font:inherit;font-size:12px;font-weight:800;min-height:32px;padding:0 10px;cursor:pointer}
.sd-col-value{
  min-width:0;
  padding:8px 6px;
  font-size:14px;
  font-weight:700;
  color:#143246;
  word-break:break-word;
  text-align:center;
}
.sd-col-value a{color:#1a6b7a}
.sd-file-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;padding:0;border-radius:8px;cursor:pointer}
.sd-file-icon svg{width:28px;height:28px;display:block}
.sd-file-icon.is-discharge{background:#eef7f8}
.sd-file-icon.is-prescription{background:#fff6ec}
.sd-file-icon.is-plain{opacity:.9;cursor:default}
.sd-file-actions{display:flex;flex-direction:column;align-items:center;gap:6px}
.sd-file-viewer{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;background:#0f2430}
.sd-file-viewer-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#143246;color:#fff}
.sd-file-viewer-bar strong{font-size:14px}
.sd-file-viewer-actions{display:flex;flex-wrap:wrap;gap:8px}
.sd-file-viewer-print,.sd-file-viewer-save,.sd-file-viewer-close{border:0;border-radius:8px;font:inherit;font-size:13px;font-weight:800;min-height:36px;padding:0 12px;cursor:pointer}
.sd-file-viewer-print{background:#1a6b7a;color:#fff}
.sd-file-viewer-save{background:#fff;color:#1a6b7a}
.sd-file-viewer-close{background:#e8f1f6;color:#143246}
.sd-file-viewer-body{flex:1;min-height:0;background:#111;display:flex;align-items:center;justify-content:center}
.sd-file-viewer-body img{max-width:100%;max-height:100%;object-fit:contain}
.sd-file-viewer-body iframe{width:100%;height:100%;border:0;background:#fff}
.sd-file-viewer-body p{color:#fff}
.sd-decide{display:flex;flex-wrap:wrap;gap:6px}
.sd-decide-yes,.sd-decide-no{border:0;border-radius:6px;font:inherit;font-size:12px;font-weight:800;min-height:32px;padding:6px 10px;cursor:pointer}
.sd-decide-yes{background:#1a6b7a;color:#fff}
.sd-decide-no{background:#fff;color:#b64b4b;border:1px solid #e2bcbc}
.sd-decide-yes:disabled,.sd-decide-no:disabled{opacity:.65;cursor:wait}
.sd-decision.is-yes{color:#0f7a4a}
.sd-decision.is-no{color:#b64b4b}
.sd-decision.is-cancel{color:#8a4b12}
.sd-admit-form{display:flex;flex-wrap:wrap;align-items:end;gap:8px}
.sd-admit-form label{display:grid;gap:4px;font-size:11px;font-weight:800;color:#5d7180}
.sd-admit-form input{width:88px;height:32px;border:1px solid #d7e2e9;border-radius:6px;padding:0 8px;font:inherit;font-size:13px}
.sd-admit-error{flex-basis:100%;margin:0;font-size:12px;color:#b64b4b}
.sd-admit-facts{display:flex;flex-wrap:wrap;align-items:end;gap:16px;margin:12px 0 0}
.sd-admit-facts p{margin:0;display:grid;gap:2px}
.sd-admit-facts span{font-size:11px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:#5d7180}
.sd-admit-facts strong{font-size:15px;color:#143246}
.sd-discharge-btn{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:14px;font-weight:800;min-height:40px;padding:0 18px;cursor:pointer;margin-left:auto}
.sd-discharge-btn:disabled{opacity:.65;cursor:wait}
`;
