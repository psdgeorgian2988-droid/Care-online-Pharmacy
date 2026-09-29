import { kindLabel } from "./orderTracking";
import RxShareCard, { rxShareCardStyles } from "./RxShareCard";
import {
  customerPaymentModeLabel,
  formatOrderMobile,
  formatOrderRupee,
  isCustomerCompletedDetail,
  itemsHeading,
  orderAddress,
  orderKind,
  orderKindExtras,
  orderLineItems,
  orderPartnerAssignment,
  orderPatientName,
  orderPaymentSummary,
  orderPin,
  orderRecordId,
  orderSlotLines,
  orderTotal,
  orderTrackLabel,
  showOrderPartnerBlock,
} from "./orderFullFields";
import { openBatchReport } from "./batchStore";
import { openReportFile, reportFileForOrder } from "./labPipeline";

function MetaRow({ label, value, href, onOpen }) {
  if (!value && !onOpen) return null;
  return (
    <p>
      <strong>{label}:</strong>{" "}
      {onOpen ? (
        <>
          <button type="button" className="order-open-report" onClick={onOpen}>
            Open report
          </button>
          {value && value !== "Report attached" ? ` · ${value}` : ""}
        </>
      ) : href ? (
        <a href={href} download={value}>
          {value}
        </a>
      ) : (
        value
      )}
    </p>
  );
}

export default function OrderFullView({
  order,
  audience = "customer",
  showRx = true,
  rxTitle = "Digital prescription",
  rxEditable = false,
  rxBusy = false,
  onCorrectMedicine,
}) {
  if (!order) return null;
  const kind = orderKind(order);
  const id = orderRecordId(order);
  const items = orderLineItems(order);
  const slots = orderSlotLines(order);
  const pay = orderPaymentSummary(order, audience);
  const partner = orderPartnerAssignment(order);
  const extras = orderKindExtras(order, audience);
  const pin = orderPin(order);
  const address = orderAddress(order);
  const name = orderPatientName(order);
  const mobile = formatOrderMobile(
    order.mobile || order.mobileNumber,
    audience,
    kind
  );
  const total = formatOrderRupee(orderTotal(order));
  const completedCustomer = isCustomerCompletedDetail(order, audience);
  const showPartner = showOrderPartnerBlock(order, audience);
  const partnerMobile = formatOrderMobile(partner.mobile, audience, kind);
  const paymentMode = completedCustomer
    ? customerPaymentModeLabel(order)
    : pay.methodText;

  return (
    <section
      className={`order-full is-${audience}${completedCustomer ? " is-completed" : ""}`}
      aria-label={completedCustomer ? "Completed order" : "Full order"}
    >
      <style>{`${rxShareCardStyles}${styles}`}</style>
      <div className="order-full-grid">
        <div>
          <p className="order-full-kicker">{kindLabel(kind)}</p>
          <h3>Order #{id || "—"}</h3>
          <MetaRow label="Date" value={order.date || order.bookedAt || order.requestedAt} />
          <MetaRow
            label="Status"
            value={completedCustomer ? "Completed" : order.status || orderTrackLabel(order)}
          />
          {audience === "customer" ? null : (
            <MetaRow label="Tracking" value={orderTrackLabel(order)} />
          )}
        </div>
        {completedCustomer ? (
          <div>
            <p className="order-full-kicker">Payment</p>
            <MetaRow label="Paid by" value={paymentMode || "Not provided"} />
          </div>
        ) : (
        <div>
          <p className="order-full-kicker">Customer</p>
          <MetaRow label="Name" value={name || "Not provided"} />
          <MetaRow label="Mobile" value={mobile || "Not provided"} />
          <MetaRow
            label={kind === "ambulance" ? "Pickup Address" : "Address"}
            value={address || "Not provided"}
          />
          <MetaRow label="PIN Code" value={pin || "Not provided"} />
          {order.outletName ? (
            <MetaRow
              label="Outlet"
              value={[order.outletName, order.outletArea].filter(Boolean).join(" · ")}
            />
          ) : null}
        </div>
        )}
        {completedCustomer ? null : (
        <div>
          <p className="order-full-kicker">Slot</p>
          <MetaRow label="Requested" value={slots.requested || "—"} />
          {slots.offered ? <MetaRow label="Offered" value={slots.offered} /> : null}
          <MetaRow
            label={slots.awaitingCustomer ? "Awaiting confirmation" : "Confirmed / current"}
            value={slots.label}
          />
        </div>
        )}
        {audience === "customer" ? null : (
        <div>
          <p className="order-full-kicker">Payment</p>
          <MetaRow label="Method" value={pay.methodText || "Not provided"} />
          <MetaRow label="Pay status" value={pay.statusText} />
          <MetaRow label="Amount" value={total} />
          {order.receiptFileData ? (
            <div className="order-full-receipt">
              <p className="order-full-kicker">Receipt</p>
              <img src={order.receiptFileData} alt="Payment receipt" />
            </div>
          ) : null}
          {pay.showSplit ? (
            <>
              {pay.sale ? <MetaRow label="Sale" value={pay.sale} /> : null}
              {pay.discount && order.split?.discountRupees > 0 ? (
                <MetaRow
                  label="Discount"
                  value={`${pay.discount}${pay.coupon ? ` · ${pay.coupon}` : ""}`}
                />
              ) : null}
              <MetaRow
                label="Staff split"
                value={[
                  pay.platformPercent != null ? `MH ${pay.platformPercent}% ${pay.platform}` : "",
                  pay.partnerPercent != null
                    ? `Partner ${pay.partnerPercent}% ${pay.partner}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </>
          ) : null}
        </div>
        )}
      </div>

      <h4>{itemsHeading(kind)}</h4>
      {items.length ? (
        <ul className="order-full-items">
          {items.map((item, index) => (
            <li key={item.id || `${item.name}-${index}`}>
              <span>
                {item.name}
                {item.quantity ? ` × ${item.quantity}` : ""}
                {item.batchNo ? ` · Batch ${item.batchNo}` : ""}
                {item.partnerCorrected && !completedCustomer ? " · partner corrected" : ""}
                {item.batchNo ? (
                  <button
                    type="button"
                    className="order-batch-report"
                    onClick={() =>
                      openBatchReport({
                        ...item,
                        productName: item.name,
                        expiryDate: item.batchExpiryDate || item.expiryDate,
                      })
                    }
                  >
                    Show batch report
                  </button>
                ) : null}
              </span>
              <strong>{item.price != null && item.price !== "" ? formatOrderRupee(item.price) : ""}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="order-full-empty">No line items on this order.</p>
      )}

      {extras.length ? (
        <div className="order-full-extras">
          {extras.map((row) => (
            <MetaRow
              key={row.label}
              label={row.label}
              value={row.value}
              href={row.href}
              onOpen={
                row.openFile
                  ? () => openReportFile(reportFileForOrder(order) || order)
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}

      {showPartner ? (
        <div className="order-full-partner">
          <p className="order-full-kicker">Partner assignment</p>
          {partner.assigned ? (
            <>
              <MetaRow label="Partner" value={partner.name || partner.org || "Assigned"} />
              {partner.org && partner.name ? <MetaRow label="Centre" value={partner.org} /> : null}
              <MetaRow label="Role" value={partner.role} />
              <MetaRow label="Mobile" value={partnerMobile} />
              <MetaRow label="Vehicle" value={partner.vehicle} />
              <MetaRow label="Unit" value={partner.unit} />
            </>
          ) : (
            <p>Not assigned yet.</p>
          )}
        </div>
      ) : null}

      {total ? (
        <p className="order-full-total">
          <strong>Total:</strong> {total}
        </p>
      ) : null}

      {showRx && !completedCustomer ? (
        <RxShareCard
          record={order}
          title={
            audience === "partner" && kind === "medicine"
              ? "Prescription — review and confirm"
              : rxTitle
          }
          editable={rxEditable}
          busy={rxBusy}
          alwaysShow={audience === "partner" && kind === "medicine"}
          onCorrectMedicine={onCorrectMedicine}
        />
      ) : null}
    </section>
  );
}

const styles = `
.order-full{margin:0;padding:10px 0;text-align:left;color:#34546b}
.order-full-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1a6b7a}
.order-full h3{margin:0 0 6px;font-size:15px;color:#143246}
.order-full h4{margin:12px 0 6px;padding:8px 0 6px;border-bottom:1px solid #edf1f3;font-size:13px;color:#143246}
.order-full-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.order-full-grid p,.order-full-extras p,.order-full-partner p,.order-full-total{margin:0 0 4px;font-size:12px;line-height:1.4}
.order-full-grid strong,.order-full-extras strong,.order-full-partner strong,.order-full-total strong{color:#143246}
.order-full-items{list-style:none;margin:0;padding:0}
.order-full-items li{display:flex;justify-content:space-between;gap:10px;margin:0;padding:5px 0;border-bottom:1px solid #edf1f3;font-size:13px;color:#34546b}
.order-full-items strong{color:#143246;white-space:nowrap}
.order-batch-report,.order-open-report{display:inline;margin:0;border:0;background:none;padding:0;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.order-batch-report{display:block;margin-top:4px}
.order-full-empty{margin:0;font-size:12px;color:#5d7180}
.order-full-extras{margin-top:8px}
.order-full-partner{margin-top:10px;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd}
.order-full-total{margin:10px 0 0;font-size:14px}
.order-full-receipt{margin-top:8px}
.order-full-receipt img{display:block;width:100%;max-height:160px;object-fit:contain;border:1px solid #d7e2e9;border-radius:8px;background:#fff}
.order-full.is-customer .order-full-grid{grid-template-columns:1fr;gap:18px}
.order-full.is-customer{padding:8px 0 16px}
.order-full.is-customer h4{margin:20px 0 10px}
.order-full.is-customer .order-full-extras{margin-top:16px}
.order-full.is-customer .order-full-partner{margin-top:18px;padding:14px}
.order-full.is-partner .order-full-grid,.order-full.is-staff .order-full-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){
  .order-full-grid,.order-full.is-partner .order-full-grid,.order-full.is-staff .order-full-grid{grid-template-columns:1fr 1fr}
  .order-full.is-customer .order-full-grid{grid-template-columns:1fr}
}
@media (max-width:640px){
  .order-full-grid,.order-full.is-partner .order-full-grid,.order-full.is-staff .order-full-grid{grid-template-columns:1fr}
}
`;
