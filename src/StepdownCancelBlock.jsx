import {
  STEPDOWN_CANCEL_POLICY,
  isStepdownCancelled,
  stepdownCancelFields,
  stepdownCancelQuote,
} from "./stepdownCancel";

export default function StepdownCancelBlock({
  order,
  onCancel,
  busy = false,
  showPolicy = true,
}) {
  if (!order) return null;
  const quote = stepdownCancelQuote(order);
  const cancelled = isStepdownCancelled(order);

  const handleCancel = () => {
    if (busy || !quote.canCancel) return;
    if (!window.confirm(quote.confirmText)) return;
    onCancel?.(stepdownCancelFields(order));
  };

  return (
    <div className="sd-cancel-box">
      <style>{styles}</style>
      {showPolicy ? <p className="sd-cancel-policy">{STEPDOWN_CANCEL_POLICY}</p> : null}
      {cancelled ? (
        <p className="sd-cancel-done" role="status">
          Booking cancelled. {quote.detailText}
        </p>
      ) : quote.canCancel ? (
        <>
          <p className="sd-cancel-detail">{quote.detailText}</p>
          <button
            type="button"
            className="sd-cancel-btn"
            disabled={busy}
            onClick={handleCancel}
          >
            {busy ? "Cancelling…" : "Cancel booking"}
          </button>
        </>
      ) : (
        <p className="sd-cancel-detail">{quote.detailText}</p>
      )}
    </div>
  );
}

const styles = `
.sd-cancel-box{margin:12px 0 0;padding:10px 12px;border:1px solid #ead8c4;border-radius:10px;background:#fff8f0}
.sd-cancel-policy,.sd-cancel-detail,.sd-cancel-done{margin:0;font-size:13px;line-height:1.45;color:#143246}
.sd-cancel-detail,.sd-cancel-done{margin-top:6px}
.sd-cancel-done{font-weight:700;color:#8a4b12}
.sd-cancel-btn{margin-top:8px;border:1px solid #d8b48a;background:#fff;color:#8a4b12;border-radius:8px;font:inherit;font-size:13px;font-weight:800;min-height:34px;padding:0 12px;cursor:pointer}
.sd-cancel-btn:disabled{opacity:.65;cursor:wait}
`;
