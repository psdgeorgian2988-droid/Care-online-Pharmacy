import { loadReviews } from "./reviewStore";
import {
  feedbackHashForOrder,
  orderFeedbackActions,
  reviewHashForOrder,
} from "./orderReview";

export default function OrderFeedbackCta({ order, audience = "customer" }) {
  const actions = orderFeedbackActions(order, audience, loadReviews());
  if (!actions.share && !actions.read) return null;

  return (
    <>
      <style>{styles}</style>
      <aside className="order-feedback-cta" aria-label="Order feedback">
        <p>
          {actions.read
            ? "Your feedback for this order is saved on this device."
            : "This order is complete. Share how it went."}
        </p>
        <div>
          {actions.share ? (
            <a className="is-primary" href={feedbackHashForOrder(order)}>
              Share feedback
            </a>
          ) : null}
          {actions.read ? (
            <a className="is-secondary" href={reviewHashForOrder(order)}>
              Read review
            </a>
          ) : null}
        </div>
      </aside>
    </>
  );
}

const styles = `
.order-feedback-cta{margin:12px 0 0;padding:12px 14px;border:1px solid #cfe4ea;border-radius:12px;background:#f3fafb;text-align:left}
.order-feedback-cta p{margin:0 0 10px;font-size:13px;line-height:1.45;color:#34546b}
.order-feedback-cta div{display:flex;flex-wrap:wrap;gap:8px}
.order-feedback-cta a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:8px;font-size:13px;font-weight:800;text-decoration:none}
.order-feedback-cta a.is-primary{background:#1a6b7a;color:#fff}
.order-feedback-cta a.is-secondary{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
`;
