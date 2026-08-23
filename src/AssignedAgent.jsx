function formatMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return mobile || "Not assigned";
}

function telHref(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length >= 11) return `tel:+${digits}`;
  return "";
}

function waHref(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 10) return `https://wa.me/91${digits}`;
  if (digits.startsWith("91") && digits.length >= 12) return `https://wa.me/${digits}`;
  return "";
}

function AssignedAgent({ record, compact = false }) {
  if (!record?.agentName || !record?.agentMobile) return null;
  const call = telHref(record.agentMobile);
  const whatsapp = waHref(record.agentMobile);

  return (
    <>
      <style>{styles}</style>
      <aside className={`assigned-agent${compact ? " is-compact" : ""}`}>
        <p className="assigned-kicker">Assigned to you now</p>
        <h3>{record.agentRole || "Assigned professional"}</h3>
        <p className="assigned-name">{record.agentName}</p>
        <p className="assigned-phone">{formatMobile(record.agentMobile)}</p>
        {record.agentUnit ? (
          <p className="assigned-meta">Unit {record.agentUnit}</p>
        ) : null}
        {record.agentVehicle ? (
          <p className="assigned-meta">Vehicle {record.agentVehicle}</p>
        ) : null}
        <div className="assigned-actions">
          {call ? (
            <a className="assigned-call" href={call}>
              Call
            </a>
          ) : null}
          {whatsapp ? (
            <a
              className="assigned-wa"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </aside>
    </>
  );
}

const styles = `
.assigned-agent{margin:12px 0;padding:14px 16px;border:1px solid #cfe4ea;border-radius:12px;background:#f3fafb;text-align:left}
.assigned-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.assigned-agent h3{margin:0 0 6px;font-size:13px;font-weight:700;color:#5d7180}
.assigned-name{margin:0;font-size:18px;font-weight:800;color:#143246}
.assigned-phone{margin:4px 0 0;font-size:15px;font-weight:700;color:#1a6b7a}
.assigned-meta{margin:4px 0 0;font-size:13px;color:#34546b}
.assigned-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.assigned-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none}
.assigned-call{background:#1a6b7a;color:#fff}
.assigned-wa{background:#fff;color:#1a6b7a;border:1px solid #1a6b7a}
.assigned-agent.is-compact{margin:10px 0;padding:12px}
`;

export default AssignedAgent;
