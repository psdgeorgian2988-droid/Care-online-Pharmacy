import { useState } from "react";
import { buildOrderBill } from "./orderBill";

export function BillButton({ order, className = "service-submit" }) {
  const [open, setOpen] = useState(false);
  if (!order) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        View bill
      </button>
      {open ? <OrderBill order={order} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default function OrderBill({ order, onClose }) {
  const bill = buildOrderBill(order);
  const seller = bill.seller;

  const printBill = () => {
    window.print();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="order-bill-overlay" role="dialog" aria-labelledby="order-bill-title">
        <div className="order-bill-sheet">
          <div className="order-bill-toolbar no-print">
            <button type="button" onClick={printBill}>
              Print / Save PDF
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
          <article className="order-bill">
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
              {bill.buyer.mobile ? <p>Mobile: {bill.buyer.mobile}</p> : null}
              {bill.buyer.address ? <p>{bill.buyer.address}</p> : null}
              {bill.buyer.pin ? <p>PIN: {bill.buyer.pin}</p> : null}
            </section>

            <table className="order-bill-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Particulars</th>
                  <th>Qty</th>
                  <th>Rate</th>
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
                    </td>
                    <td>{line.qty}</td>
                    <td>{bill.formatInr(line.rate)}</td>
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
            </p>
          </article>
        </div>
      </div>
    </>
  );
}

const styles = `
.order-bill-overlay{position:fixed;inset:0;z-index:130;background:rgba(8,32,42,.48);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}
.order-bill-sheet{width:min(720px,100%);margin:12px auto 24px}
.order-bill-toolbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px}
.order-bill-toolbar button{border:none;border-radius:8px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;background:#1a6b7a;color:#fff}
.order-bill-toolbar button:last-child{background:#fff;color:#143246;border:1px solid #cfe0e8}
.order-bill{background:#fff;color:#143246;border:1px solid #d7e2e9;border-radius:12px;padding:22px 20px;font-size:13px}
.order-bill-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:2px solid #1a6b7a}
.order-bill-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.order-bill h1{margin:0 0 6px;font-size:22px}
.order-bill h2{margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5d7180}
.order-bill p{margin:0 0 4px;line-height:1.4}
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
@media print{
  body *{visibility:hidden}
  .order-bill-overlay,.order-bill-overlay *{visibility:visible}
  .order-bill-overlay{position:static;background:#fff;padding:0}
  .no-print{display:none !important}
  .order-bill{border:none;box-shadow:none}
}
`;
