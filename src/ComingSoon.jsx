import {
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
} from "./careChat";

export default function ComingSoon({ name = "This service", compact = false }) {
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
          We are preparing this service with extra care, so it is ready when you
          need it.
        </p>
        <p className="coming-soon-thanks">
          Thank you for your patience. MediHome will open {name.toLowerCase()} as
          soon as it is set up for you.
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
.coming-soon{position:relative;overflow:hidden;max-width:640px;margin:28px auto;padding:36px 28px 28px;border-radius:20px;background:linear-gradient(180deg,#f4fbff 0%,#fff 55%,#f7fbf8 100%);border:1px solid #d7e6ee;text-align:center;color:#143246;box-shadow:0 16px 40px rgba(20,50,70,.08)}
.coming-soon.is-compact{margin:0;padding:28px 18px;box-shadow:none}
.coming-soon-glow{position:absolute;inset:-40% -20% auto;height:180px;background:radial-gradient(circle,#b8e4d4 0%,transparent 70%);opacity:.55;pointer-events:none}
.coming-soon-pulse{position:relative;width:72px;height:72px;margin:0 auto 16px}
.coming-soon-pulse span{position:absolute;inset:0;border-radius:50%;border:2px solid #1a6b7a;animation:comingSoonRipple 2.4s ease-out infinite}
.coming-soon-pulse span:nth-child(2){animation-delay:.6s}
.coming-soon-pulse span:nth-child(3){animation-delay:1.2s;background:#1a6b7a;border:0;inset:22px;animation:comingSoonBeat 2.4s ease-in-out infinite}
.coming-soon-kicker{position:relative;margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#1a6b7a}
.coming-soon h1{position:relative;margin:0 0 10px;font-size:28px;line-height:1.2}
.coming-soon-lead,.coming-soon-thanks{position:relative;margin:0 auto 10px;max-width:46ch;color:#34546b;font-size:15px;line-height:1.5}
.coming-soon-thanks{color:#1a6b7a;font-weight:600}
.coming-soon-actions{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}
.coming-soon-actions a{border-radius:999px;padding:8px 14px;text-decoration:none;font-size:13px;font-weight:800}
.coming-soon-actions a:first-child{background:#1a6b7a;color:#fff}
.coming-soon-actions a:nth-child(2),.coming-soon-actions a:nth-child(3){background:#fff;color:#1a6b7a;border:1px solid #cfe0e8}
@keyframes comingSoonRipple{0%{transform:scale(.55);opacity:.45}100%{transform:scale(1.15);opacity:0}}
@keyframes comingSoonBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@media (max-width:640px){
  .coming-soon{margin:16px 10px;padding:28px 16px}
  .coming-soon h1{font-size:22px}
}
`;
