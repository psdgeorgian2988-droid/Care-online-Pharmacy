import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BillButton } from "./OrderBill.jsx";
import { orderPayableRupees } from "./partnerCollect";
import { paymentMethodLabel, paymentUpiUri } from "./paymentMethods";
import {
  STEPDOWN_PAY_OPTIONS,
  isStepdownPaid,
  isStepdownPayMethod,
} from "./stepdownDesk";
import { stepdownBillLines } from "./stepdownBill";

function rupees(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function StepdownDischargePay({
  order,
  partner,
  busy = false,
  canPay = true,
  autoOpenBill = false,
  onCollect,
}) {
  const [method, setMethod] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [error, setError] = useState("");
  const payable = orderPayableRupees(order || {});
  const lines = stepdownBillLines(order || {});
  const paid = isStepdownPaid(order);
  const showPay = canPay && !paid;
  const accountId = order?.patientAccountId || "";
  const payUri = paymentUpiUri({
    amount: payable,
    kind: "stepdown",
    orderId: order?.bookingId || order?.id,
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

  if (!order) return null;

  const confirm = () => {
    if (!isStepdownPayMethod(method)) {
      setError("Select Cash, QR Code, or UPI.");
      return;
    }
    setError("");
    onCollect?.({
      paymentMethod: method,
      paid: true,
      paidOn: "partner",
    });
  };

  return (
    <div className="sd-pay-box">
      <style>{styles}</style>
      {accountId ? (
        <>
          <p className="sd-pay-kicker">Patient account</p>
          <p className="sd-pay-account">
            <strong>{accountId}</strong>
            {order.patientAccountName ? ` · ${order.patientAccountName}` : ""}
          </p>
        </>
      ) : null}
      <p className="sd-pay-kicker">Itemised bill</p>
      <p className="sd-pay-total">{rupees(payable)}</p>
      <table className="sd-pay-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Particulars</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => (
            <tr key={`${row.sno}-${row.service || row.kind}`}>
              <td>{row.sno}</td>
              <td>
                <span>{row.name}</span>
                {row.detail ? <small>{row.detail}</small> : null}
                {row.billFileData ? (
                  <small>
                    <a href={row.billFileData} target="_blank" rel="noreferrer">
                      {row.billFileName || "Medicine bill"}
                    </a>
                  </small>
                ) : null}
              </td>
              <td>{rupees(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <BillButton
        order={order}
        className="sd-pay-view"
        label="Print itemised bill"
        autoOpen={autoOpenBill}
      />
      {paid ? (
        <p className="sd-pay-done">
          Paid · {paymentMethodLabel(order.paymentMethod, "Cash")}
        </p>
      ) : showPay ? (
        <>
          <p className="sd-pay-kicker">Payment</p>
          <div className="sd-pay-methods" role="radiogroup" aria-label="Payment">
            {STEPDOWN_PAY_OPTIONS.map((option) => (
              <label key={option.value} className={method === option.value ? "is-on" : ""}>
                <input
                  type="radio"
                  name={`sd-pay-${order.bookingId || order.id}`}
                  checked={method === option.value}
                  disabled={busy}
                  onChange={() => {
                    setMethod(option.value);
                    setError("");
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {method === "qr" || method === "upi" ? (
            <div className="sd-pay-qr">
              {qrSrc ? (
                <img src={qrSrc} alt={`Payment QR for ${order.bookingId || "stay"}`} />
              ) : (
                <p>Preparing QR…</p>
              )}
              <p>
                {method === "upi"
                  ? `Scan or pay by UPI ${rupees(payable)}.`
                  : `Scan this QR to pay ${rupees(payable)}.`}
              </p>
            </div>
          ) : null}
          <button type="button" className="sd-pay-collect" disabled={busy} onClick={confirm}>
            {busy ? "Saving…" : "Discharge"}
          </button>
          {error ? <p className="sd-pay-error">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

const styles = `
.sd-pay-box{margin:12px 0 0;padding:12px;border:1px solid #c5d6de;border-radius:10px;background:#fff}
.sd-pay-kicker{margin:10px 0 6px;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#1a6b7a}
.sd-pay-kicker:first-child{margin-top:0}
.sd-pay-account{margin:0 0 8px;font-size:14px;color:#143246}
.sd-pay-total{margin:0 0 8px;font-size:22px;font-weight:800;color:#143246}
.sd-pay-table{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:13px}
.sd-pay-table th,.sd-pay-table td{padding:8px 6px;border-bottom:1px solid #e4ecef;text-align:left;vertical-align:top}
.sd-pay-table th{font-size:11px;letter-spacing:.3px;text-transform:uppercase;color:#5d7180}
.sd-pay-table th:last-child,.sd-pay-table td:last-child{text-align:right;font-weight:800;color:#143246;white-space:nowrap}
.sd-pay-table td span{display:block;font-weight:700;color:#143246}
.sd-pay-table small{display:block;margin-top:2px;font-size:12px;font-weight:500;color:#5d7180}
.sd-pay-table a{color:#1a6b7a}
.sd-pay-view{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:34px;padding:0 12px;cursor:pointer}
.sd-pay-done{margin:10px 0 0;font-size:14px;font-weight:800;color:#0f7a4a}
.sd-pay-methods{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.sd-pay-methods label{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 10px;border:1px solid #d7e2e9;border-radius:8px;background:#f7fbfd;font-size:13px;font-weight:700;color:#143246;cursor:pointer}
.sd-pay-methods label.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.sd-pay-qr{display:grid;justify-items:center;gap:6px;margin:0 0 10px;padding:10px;border:1px dashed #c5d6e0;border-radius:10px;background:#f7fbfd;text-align:center}
.sd-pay-qr img{width:168px;height:168px;background:#fff}
.sd-pay-qr p{margin:0;max-width:36ch;font-size:12px;line-height:1.4;color:#34546b}
.sd-pay-collect{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:13px;font-weight:800;min-height:38px;padding:0 14px;cursor:pointer}
.sd-pay-collect:disabled{opacity:.65;cursor:wait}
.sd-pay-error{margin:8px 0 0;font-size:12px;color:#b64b4b}
`;
