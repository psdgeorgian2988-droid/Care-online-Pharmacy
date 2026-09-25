import { useRef, useState } from "react";
import { BillButton } from "./OrderBill.jsx";
import { fileToPrescriptionDraft } from "./prescriptionDraft";
import {
  STEPDOWN_CHARGE_OPTIONS,
  addStepdownCharge,
  stepdownBillTotal,
  stepdownChargeUsesDays,
  stepdownDayRate,
  stepdownHeadingTotals,
} from "./stepdownBill";

function rupees(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function StepdownBillingPanel({
  order,
  canEdit = false,
  busy = false,
  addedBy = "",
  onAddCharge,
}) {
  const fileRef = useRef(null);
  const [service, setService] = useState("");
  const [qty, setQty] = useState("1");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [billFile, setBillFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  if (!order) return null;
  const headings = stepdownHeadingTotals(order);
  const accountId = order.patientAccountId || "";
  const bookingRate = stepdownDayRate(order);
  const usesDays = stepdownChargeUsesDays(service);
  const isMedicine = service === "medicine";

  const addCharge = () => {
    const result = addStepdownCharge(order, {
      service,
      qty: usesDays ? qty : 1,
      days: qty,
      rate: usesDays ? bookingRate : rate,
      note: service === "other" ? note : "",
      date,
      billFileName: billFile?.fileName,
      billFileData: billFile?.fileData,
      billFileType: billFile?.fileType,
      addedBy: addedBy || order.inchargeName,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setNote("");
    setRate("");
    setQty("1");
    setBillFile(null);
    onAddCharge?.(result);
  };

  const onPickBill = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setBillFile(await fileToPrescriptionDraft(file));
    } catch (err) {
      setError(err?.message || "Could not attach the medicine bill.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sd-bill-box">
      <style>{styles}</style>
      {accountId ? (
        <>
          <p className="sd-bill-kicker">Patient account</p>
          <p className="sd-bill-account">
            <strong>{accountId}</strong>
            {order.patientAccountName ? ` · ${order.patientAccountName}` : ""}
          </p>
        </>
      ) : null}
      <p className="sd-bill-kicker">Billing</p>
      <p className="sd-bill-summary">{rupees(stepdownBillTotal(order))}</p>
      <ul className="sd-bill-lines">
        {headings.map((row) => (
          <li key={row.id}>
            <span>{row.label}</span>
            <strong>{rupees(row.amount)}</strong>
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="sd-bill-add">
          <label>
            Billing heading
            <select
              value={service}
              disabled={busy}
              onChange={(event) => {
                setService(event.target.value);
                setError("");
                setBillFile(null);
              }}
            >
              <option value="">Select heading</option>
              {STEPDOWN_CHARGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {service === "other" ? (
            <label className="sd-bill-wide">
              Other heading
              <input
                value={note}
                disabled={busy}
                placeholder="e.g. Nebulisation"
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          ) : null}
          {usesDays ? (
            <label>
              No of Days
              <input
                type="text"
                inputMode="numeric"
                value={qty}
                disabled={busy}
                onChange={(event) => setQty(event.target.value.replace(/\D/g, ""))}
              />
            </label>
          ) : (
            <label>
              Date
              <input
                type="date"
                value={date}
                disabled={busy}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
          {usesDays ? null : (
            <label>
              Amount ₹
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                disabled={busy}
                onChange={(event) => setRate(event.target.value.replace(/[^\d.]/g, ""))}
              />
            </label>
          )}
          {isMedicine ? (
            <div className="sd-bill-attach">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={onPickBill}
              />
              <button
                type="button"
                disabled={busy || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Attaching…" : billFile?.fileName ? "Replace medicine bill" : "Attach medicine bill"}
              </button>
              {billFile?.fileName ? <small>{billFile.fileName}</small> : null}
            </div>
          ) : null}
          <button type="button" disabled={busy || uploading} onClick={addCharge}>
            {busy ? "Saving…" : "Add to bill"}
          </button>
          {error ? <p className="sd-bill-error">{error}</p> : null}
        </div>
      ) : null}
      <BillButton
        order={order}
        className="sd-bill-print"
        label={canEdit ? undefined : "View complete bill"}
      />
    </div>
  );
}

const styles = `
.sd-bill-box{margin:12px 0 0;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd}
.sd-bill-kicker{margin:10px 0 6px;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#1a6b7a}
.sd-bill-kicker:first-child{margin-top:0}
.sd-bill-account{margin:0 0 8px;font-size:14px;color:#143246}
.sd-bill-summary{margin:0 0 8px;font-size:13px;line-height:1.4;color:#143246}
.sd-bill-lines{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.sd-bill-lines li{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#34546b}
.sd-bill-lines strong{color:#143246}
.sd-bill-add{display:flex;flex-wrap:wrap;align-items:end;gap:8px;margin:10px 0}
.sd-bill-add label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
.sd-bill-wide{flex:1 1 180px}
.sd-bill-add select,.sd-bill-add input{min-width:88px;height:34px;border:1px solid #d7e2e9;border-radius:8px;padding:0 8px;font:inherit;background:#fff}
.sd-bill-add select{min-width:200px}
.sd-bill-add button,.sd-bill-print{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:34px;padding:0 12px;cursor:pointer}
.sd-bill-print{margin-top:4px}
.sd-bill-attach{display:grid;gap:4px}
.sd-bill-attach input{display:none}
.sd-bill-attach small{font-size:11px;color:#1a6b7a}
.sd-bill-error{flex-basis:100%;margin:0;font-size:12px;color:#b64b4b}
`;
