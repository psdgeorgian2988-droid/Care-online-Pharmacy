import {
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
} from "./careChat";

export default function ComingSoon({
  name = "This service",
  compact = false,
  lead,
  thanks,
}) {
  const title = `${name} Is Coming Soon`;
  return (
    <>
      <style>{styles}</style>
      <div className={`coming-soon${compact ? " is-compact" : ""}`}>
        <div className="coming-soon-glow" aria-hidden="true" />
        <div className="coming-soon-pulse" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="coming-soon-kicker">Almost ready</p>
        <h1>{title}</h1>
        <p className="coming-soon-lead">
          {lead ||
            "We are preparing this service with extra care, so it is ready when you need it."}
        </p>
        <p className="coming-soon-thanks">
          {thanks ||
            `Thank you for your patience. MediHome will open ${name.toLowerCase()} as soon as it is set up for you.`}
        </p>
        <div className="coming-soon-actions">
          <a href="#home">Browse other services</a>
          <a href={`tel:${CARE_PHONE_TEL}`}>Call {CARE_PHONE_DISPLAY}</a>
          <a href={CARE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            WhatsApp care
          </a>
        </div>
      </div>
    </>
  );
}

const styles = `
.coming-soon{position:relative;overflow:hidden;width:100%;max-width:none;margin:0;padding:16px;border-radius:12px;background:#f7fbfe;border:1px solid #d3e6f3;text-align:left;color:#143246;box-shadow:none}
.coming-soon.is-compact{margin:0;padding:16px;box-shadow:none}
.coming-soon-glow,.coming-soon-pulse{display:none}
.coming-soon-kicker{position:relative;margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2f7a7a}
.coming-soon h1{position:relative;margin:0 0 8px;font-size:clamp(18px,2.2vw,26px);line-height:1.25;color:#143246}
.coming-soon-lead,.coming-soon-thanks{position:relative;margin:0 0 10px;max-width:none;color:#5d7180;font-size:15px;line-height:1.5}
.coming-soon-thanks{color:#1a6b7a;font-weight:600}
.coming-soon-actions{position:relative;display:flex;flex-wrap:wrap;justify-content:flex-start;gap:8px;margin-top:14px}
.coming-soon-actions a{border-radius:8px;padding:8px 14px;text-decoration:none;font-size:13px;font-weight:700}
.coming-soon-actions a:first-child{background:#1a6b7a;color:#fff}
.coming-soon-actions a:nth-child(2),.coming-soon-actions a:nth-child(3){background:#fff;color:#1a6b7a;border:1px solid #cfe0e8}
@media (max-width:640px){
  .coming-soon{padding:14px}
  .coming-soon h1{font-size:20px}
}
`;
