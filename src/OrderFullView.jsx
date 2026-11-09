import RxShareCard, { rxShareCardStyles } from "./RxShareCard";
import {
  isCustomerCompletedDetail,
  orderKind,
  orderRecordId,
  orderTestName,
  showOrderPartnerBlock,
} from "./orderFullFields";
import OrderFeedbackCta from "./OrderFeedbackCta";

export default function OrderFullView({
  order,
  audience = "customer",
  showRx = true,
  rxTitle = "Digital prescription",
  rxEditable = false,
  rxBusy = false,
  onCorrectMedicine,
  onBack,
  backLabel = "Back to orders",
}) {
  if (!order) return null;
  const kind = orderKind(order);
  const id = orderRecordId(order);
  const completedCustomer = isCustomerCompletedDetail(order, audience);
  const partnerBlock = showOrderPartnerBlock(order, audience);

  return (
    <section
      className={`order-full is-${audience}${completedCustomer ? " is-completed" : ""}${partnerBlock ? "" : ""}`}
      aria-label={completedCustomer ? "Completed order" : "Order"}
    >
      <style>{`${rxShareCardStyles}${styles}`}</style>
      {onBack ? (
        <p className="order-full-back-wrap">
          <button type="button" className="order-full-back" onClick={onBack}>
            {backLabel}
          </button>
        </p>
      ) : null}
      <h3>{orderTestName(order)}</h3>
      <p className="order-full-kicker">Order no #{id || "—"}</p>

      {completedCustomer ? (
        <OrderFeedbackCta order={order} audience="customer" />
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
.order-full-back-wrap{margin:0 0 10px}
.order-full-back{border:0;background:none;padding:0;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
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
