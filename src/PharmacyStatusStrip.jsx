import {
  PHARMACY_TRACK_STEPS,
  pharmacyStatusLabel,
  pharmacyStepState,
  pharmacyTrackKey,
} from "./pharmacyTrack";

export default function PharmacyStatusStrip({ order }) {
  if (!order) return null;
  const current = pharmacyTrackKey(order);
  const done = pharmacyStepState(order);
  return (
    <div className="pharmacy-status" aria-label="Pharmacy order status">
      <style>{styles}</style>
      <p className="pharmacy-status-now">
        Current status: <strong>{pharmacyStatusLabel(current)}</strong>
      </p>
      <ol className="pharmacy-status-steps">
        {PHARMACY_TRACK_STEPS.map((step, index) => {
          const isDone = Boolean(done[step.key]);
          const isCurrent = current === step.key;
          return (
            <li
              key={step.key}
              className={`pharmacy-status-step${isDone ? " is-done" : ""}${
                isCurrent ? " is-current" : ""
              }`}
            >
              <span>{isDone && !isCurrent ? "✓" : index + 1}</span>
              <p>{step.label}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const styles = `
.pharmacy-status{margin:10px 0 14px}
.pharmacy-status-now{margin:0 0 8px;font-size:13px;color:#34546b}
.pharmacy-status-now strong{color:#143246}
.pharmacy-status-steps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;list-style:none;margin:0;padding:0}
.pharmacy-status-step{margin:0;padding:8px 4px;border:1px solid #d7e2e9;border-radius:8px;background:#f7fafc;text-align:center}
.pharmacy-status-step span{display:grid;place-items:center;width:22px;height:22px;margin:0 auto 4px;border-radius:50%;background:#d7e2e9;color:#143246;font-size:11px;font-weight:800}
.pharmacy-status-step p{margin:0;font-size:11px;font-weight:800;color:#34546b;line-height:1.25}
.pharmacy-status-step.is-done{border-color:#b7e4c7;background:#e8f8ee}
.pharmacy-status-step.is-done span{background:#1c9b61;color:#fff}
.pharmacy-status-step.is-current{border-color:#1a6b7a;background:#e8f4f6}
.pharmacy-status-step.is-current span{background:#1a6b7a;color:#fff}
@media (max-width:700px){.pharmacy-status-steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;
