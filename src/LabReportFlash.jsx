import { LAB_REPORT_DELIVERY_LINES, labReportTiming } from "./appointmentSlot.js";

/** Both report-delivery lines stay on the customer booking and order screens. */
export default function LabReportFlash({ slot = "" }) {
  const timing = labReportTiming(slot);
  return (
    <div className="lab-report-flash" role="status" aria-label="Report delivery time">
      {LAB_REPORT_DELIVERY_LINES.map((line) => (
        <p key={line.id} className={timing === line.id ? "is-current" : ""}>
          {line.text}
        </p>
      ))}
      <style>{`
        .lab-report-flash{
          display:flex;
          flex-direction:column;
          gap:6px;
          grid-column:1 / -1;
          margin:0 0 8px;
          padding:12px 14px;
          border-radius:12px;
          border:1px solid #e0a100;
          background:#fff8e8;
          color:#6a4200;
          animation:lab-report-flash 1s ease-in-out 4;
        }
        .lab-report-flash p{margin:0;font-size:14px;font-weight:700;line-height:1.45}
        .lab-report-flash p.is-current{
          padding:6px 8px;
          border-radius:8px;
          background:#fff;
          box-shadow:inset 3px 0 0 #c46a12;
        }
        @keyframes lab-report-flash{
          0%,100%{box-shadow:0 0 0 0 rgba(224,161,0,0)}
          50%{box-shadow:0 0 0 4px rgba(224,161,0,.28)}
        }
        @media (prefers-reduced-motion: reduce){
          .lab-report-flash{animation:none}
        }
      `}</style>
    </div>
  );
}
