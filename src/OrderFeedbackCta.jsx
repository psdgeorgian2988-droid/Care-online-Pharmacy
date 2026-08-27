function isCompleted(order) {
  return Boolean(
    order?.trackCompleted ||
      order?.checkDeliverAt ||
      order?.qrReceivedAt ||
      String(order?.trackStatus || "").toLowerCase() === "done"
  );
}

export default function OrderFeedbackCta({
  order,
  completed = false,
  className = "",
}) {
  if (!completed && !isCompleted(order)) return null;

  return (
    <>
      <style>{styles}</style>
      <aside className={`order-feedback-cta ${className}`.trim()}>
        <p>
          This order is complete. Share how the medicines or service went, or
          read what other patients said.
        </p>
        <div>
          <a href="#feedback">Share feedback</a>
          <a href="#reviews">Read reviews</a>
        </div>
      </aside>
    </>
  );
}

const styles = `
.order-feedback-cta{margin:12px 0 0;padding:12px 14px;border:1px solid #cfe4ea;border-radius:12px;background:#f3fafb;text-align:left}
.order-feedback-cta p{margin:0 0 10px;font-size:13px;line-height:1.45;color:#34546b}
.order-feedback-cta div{display:flex;flex-wrap:wrap;gap:8px}
.order-feedback-cta a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:8px;background:#1a6b7a;color:#fff;font-size:13px;font-weight:800;text-decoration:none}
.order-feedback-cta a:last-child{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
`;
