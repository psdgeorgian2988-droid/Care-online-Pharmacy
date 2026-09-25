import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  buildAddressSlip,
  buildOrderBill,
  orderShowsBillQty,
  orderShowsDeliverySlip,
} from "./orderBill";
import { orderIdOf, orderQrUrl } from "./orderQr";
import { maskMobile } from "./personFields";

export function BillButton({ order, className = "service-submit", label, autoOpen = false }) {
  const [open, setOpen] = useState(autoOpen);
  if (!order) return null;
  const showSlip = orderShowsDeliverySlip(order);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label || (showSlip ? "View bill / print QR" : "View bill")}
      </button>
      {open ? <OrderBill order={order} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default function OrderBill({ order, onClose }) {
  const bill = buildOrderBill(order);
  const slip = buildAddressSlip(order);
  const showSlip = orderShowsDeliverySlip(order);
  const showQty = orderShowsBillQty(order);
  const seller = bill.seller;
  const id = orderIdOf(order) || slip.id;
  const [qrSrc, setQrSrc] = useState("");
  const [printMode, setPrintMode] = useState(showSlip ? "both" : "bill");

  useEffect(() => {
    if (!id || !showSlip) {
      setQrSrc("");
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(orderQrUrl(id, order), {
      margin: 1,
      width: 220,
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
  }, [id, order, showSlip]);

  const printNow = (mode) => {
    setPrintMode(mode);
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <>
      <style>{styles}</style>
      <div
        className={`order-bill-overlay print-mode-${printMode}`}
        role="dialog"
        aria-labelledby="order-bill-title"
      >
        <div className="order-bill-sheet">
          <div className="order-bill-toolbar no-print">
            <button type="button" onClick={() => printNow("bill")}>
              {showSlip ? "Print bill with QR" : "Print bill"}
            </button>
            {showSlip ? (
              <button type="button" onClick={() => printNow("slip")}>
                Print address slip with QR
              </button>
            ) : null}
            {showSlip ? (
              <button type="button" onClick={() => printNow("both")}>
                Print both
              </button>
            ) : null}
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
          <article className="order-bill print-bill">
            <header className="order-bill-head">
              <div>
                <p className="order-bill-kicker">Tax invoice</p>
                <h1 id="order-bill-title">{seller.tradeName || seller.name}</h1>
                <p>{seller.address || seller.area}</p>
                {seller.phone ? <p>Phone: +91 {seller.phone}</p> : null}
              </div>
              <div className="order-bill-meta">
                <p>
                  <strong>Invoice</strong> {bill.invoiceNo}
                </p>
                <p>
                  <strong>Date</strong> {bill.date || "—"}
                </p>
                <p>
                  <strong>Service</strong> {bill.kindLabel}
                </p>
                {showSlip ? <OrderQrStamp src={qrSrc} id={id} compact /> : null}
              </div>
            </header>

            <section className="order-bill-seller" aria-label="Billed by">
              <h2>Billed by</h2>
              <p>
                <strong>{seller.name}</strong>
              </p>
              {seller.area ? <p>{seller.area}</p> : null}
              <p>
                <strong>GSTIN:</strong> {seller.gstin || "—"}
              </p>
              {seller.dlNo ? (
                <p>
                  <strong>{seller.licenseLabel || "DL No."}:</strong> {seller.dlNo}
                </p>
              ) : null}
              {bill.billedOnMediHomeGst ? (
                <p className="order-bill-note">
                  This service is billed on MediHome GST.
                </p>
              ) : bill.kind === "medicine" ? (
                <p className="order-bill-note">
                  Medicines are dispatched from this PIN-assigned retail counter.
                </p>
              ) : (
                <p className="order-bill-note">
                  Diagnostics billed by the assigned lab / imaging centre.
                </p>
              )}
            </section>

            <section className="order-bill-buyer" aria-label="Billed to">
              <h2>Billed to</h2>
              <p>
                <strong>{bill.buyer.name}</strong>
              </p>
              {bill.buyer.mobile ? <p>Mobile: {maskMobile(bill.buyer.mobile)}</p> : null}
              {bill.buyer.address ? <p>{bill.buyer.address}</p> : null}
              {bill.buyer.pin ? <p>PIN: {bill.buyer.pin}</p> : null}
            </section>

            <table className="order-bill-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Particulars</th>
                  {showQty ? <th>Qty</th> : null}
                  {showQty ? <th>Rate</th> : null}
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.lines.map((line) => (
                  <tr key={line.sno}>
                    <td>{line.sno}</td>
                    <td>
                      {line.name}
                      {line.detail ? <small>{line.detail}</small> : null}
                      {line.billFileData ? (
                        <small>
                          <a href={line.billFileData} target="_blank" rel="noreferrer">
                            {line.billFileName || "Medicine bill"}
                          </a>
                        </small>
                      ) : null}
                    </td>
                    {showQty ? <td>{line.qty}</td> : null}
                    {showQty ? <td>{bill.formatInr(line.rate)}</td> : null}
                    <td>{bill.formatInr(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="order-bill-totals">
              <div>
                <dt>Sale / MRP</dt>
                <dd>{bill.formatInr(bill.sale)}</dd>
              </div>
              {bill.discount > 0 ? (
                <div>
                  <dt>
                    Discount{bill.couponCode ? ` (${bill.couponCode})` : ""}
                  </dt>
                  <dd>− {bill.formatInr(bill.discount)}</dd>
                </div>
              ) : null}
              <div className="is-pay">
                <dt>Amount payable</dt>
                <dd>{bill.formatInr(bill.payable)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{bill.payment}</dd>
              </div>
            </dl>
            <p className="order-bill-foot">
              Amount is inclusive of applicable GST. This is a computer-generated
              invoice from MediHome.
              {showSlip
                ? " Scan this QR to pick up the order. The customer scans the same QR on delivery."
                : ""}
            </p>
          </article>

          {showSlip ? (
          <article className="order-address-slip print-slip" aria-label="Address slip">
            <div className="order-address-slip-copy">
              <p className="order-bill-kicker">Address slip</p>
              <h2>Deliver to</h2>
              <p>
                <strong>{slip.name}</strong>
              </p>
              {slip.address ? <p>{slip.address}</p> : null}
              {slip.pin ? <p>PIN {slip.pin}</p> : null}
              {slip.mobile ? <p>Mobile {slip.mobile}</p> : null}
              <p className="order-address-slip-id">Order #{slip.id}</p>
              {slip.items.length ? (
                <ul>
                  {slip.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <p className="order-bill-note">
                Stick this slip on the parcel. Scan this QR to pick up the
                order. The customer scans the same QR on delivery.
              </p>
            </div>
            <OrderQrStamp src={qrSrc} id={id} />
          </article>
          ) : null}
        </div>
      </div>
    </>
  );
}

function OrderQrStamp({ src, id, compact = false }) {
  return (
    <figure className={`order-bill-qr${compact ? " is-compact" : ""}`}>
      {src ? (
        <img src={src} alt={`Order QR for ${id}`} />
      ) : (
        <div className="order-qr-wait">Preparing QR…</div>
      )}
      <figcaption>Scan order QR · #{id}</figcaption>
    </figure>
  );
}

const styles = `
.order-bill-overlay{position:fixed;inset:0;z-index:130;background:rgba(8,32,42,.48);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}
.order-bill-sheet{width:min(720px,100%);margin:12px auto 24px}
.order-bill-toolbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.order-bill-toolbar button{border:none;border-radius:8px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;background:#1a6b7a;color:#fff}
.order-bill-toolbar button:last-child{background:#fff;color:#143246;border:1px solid #cfe0e8}
.order-bill,.order-address-slip{background:#fff;color:#143246;border:1px solid #d7e2e9;border-radius:12px;padding:22px 20px;font-size:13px}
.order-bill-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:2px solid #1a6b7a}
.order-bill-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.order-bill h1{margin:0 0 6px;font-size:22px}
.order-bill h2,.order-address-slip h2{margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5d7180}
.order-bill p,.order-address-slip p{margin:0 0 4px;line-height:1.4}
.order-bill-meta{text-align:right}
.order-bill-seller,.order-bill-buyer{margin-top:14px;padding:10px 12px;background:#f4faf8;border-radius:8px}
.order-bill-note{margin-top:6px;color:#1a6b7a;font-weight:700}
.order-bill-table{width:100%;border-collapse:collapse;margin-top:14px}
.order-bill-table th,.order-bill-table td{border-bottom:1px solid #e5edf1;padding:8px 6px;text-align:left;vertical-align:top}
.order-bill-table th:nth-child(3),.order-bill-table td:nth-child(3),
.order-bill-table th:nth-child(4),.order-bill-table td:nth-child(4),
.order-bill-table th:nth-child(5),.order-bill-table td:nth-child(5){text-align:right}
.order-bill-table small{display:block;color:#5d7180;font-size:11px}
.order-bill-totals{margin:12px 0 0 auto;width:min(320px,100%)}
.order-bill-totals div{display:flex;justify-content:space-between;gap:12px;padding:4px 0}
.order-bill-totals .is-pay{margin-top:6px;padding-top:8px;border-top:2px solid #1a6b7a;font-size:15px;font-weight:800}
.order-bill-foot{margin-top:16px;color:#5d7180;font-size:11px}
.order-bill-qr{margin:10px 0 0;text-align:center}
.order-bill-qr img{width:140px;height:140px;display:block;margin:0 auto 4px;background:#fff}
.order-bill-qr.is-compact img{width:96px;height:96px}
.order-bill-qr figcaption{margin:0;font-size:11px;font-weight:800;color:#1a6b7a}
.order-address-slip{margin-top:16px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.order-address-slip-copy{min-width:0}
.order-address-slip-id{margin-top:8px;font-weight:800}
.order-address-slip ul{margin:8px 0 0;padding-left:18px}
@media print{
  body *{visibility:hidden}
  .order-bill-overlay,.order-bill-overlay *{visibility:visible}
  .order-bill-overlay{position:static;background:#fff;padding:0}
  .no-print{display:none !important}
  .order-bill,.order-address-slip{border:none;box-shadow:none}
  .print-mode-bill .print-slip{display:none !important}
  .print-mode-slip .print-bill{display:none !important}
  .print-mode-both .print-slip{page-break-before:always}
}
`;
