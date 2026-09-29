import {
  CARE_EMAIL,
  CARE_HOURS,
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
} from "./careChat";

/** Classic Need help care panel — call / WhatsApp / contact, no chatbot. */
export default function NeedHelp({ open, onOpen, onClose }) {
  return (
    <>
      <style>{styles}</style>
      {!open ? (
        <button
          type="button"
          className="need-help-fab"
          onClick={onOpen}
          aria-label="Need help"
        >
          Need help
        </button>
      ) : null}

      {open ? (
        <section
          className="need-help-panel is-open"
          role="dialog"
          aria-labelledby="need-help-title"
        >
          <header className="need-help-head">
            <div>
              <p>MediHome</p>
              <h2 id="need-help-title">Need help</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close need help">
              ×
            </button>
          </header>
          <p className="need-help-hours">Customer care · {CARE_HOURS}</p>
          <div className="need-help-body">
            <p>
              Reach MediHome customer care for bookings, orders, and support.
            </p>
            <a className="need-help-action" href={`tel:${CARE_PHONE_TEL}`}>
              Call {CARE_PHONE_DISPLAY}
            </a>
            <a
              className="need-help-action is-wa"
              href={CARE_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp care
            </a>
            <a className="need-help-action is-quiet" href={`mailto:${CARE_EMAIL}`}>
              Email {CARE_EMAIL}
            </a>
            <a
              className="need-help-action is-quiet"
              href="#contact"
              onClick={onClose}
            >
              Open Contact page
            </a>
          </div>
        </section>
      ) : null}
    </>
  );
}

const styles = `
.need-help-fab{position:relative;right:auto;bottom:auto;z-index:85;height:28px;border:1px solid rgba(255,255,255,.85);border-radius:0;background:rgba(255,255,255,.16);color:#fff;font:inherit;font-size:12px;font-weight:700;padding:0 12px;box-shadow:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0}
.need-help-panel{position:fixed;right:10px;bottom:52px;z-index:88;width:min(340px,calc(100vw - 32px));display:flex;flex-direction:column;background:#fff;border:1px solid #d7e6ee;border-radius:12px;box-shadow:0 16px 40px rgba(20,50,70,.2);overflow:hidden;transform-origin:bottom right;animation:need-help-in .28s ease}
.need-help-head{display:flex;justify-content:space-between;gap:8px;padding:12px 14px;background:#0639b8;color:#fff}
.need-help-head p{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.need-help-head h2{margin:2px 0 0;font-size:16px}
.need-help-head button{border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.need-help-hours{margin:0;padding:6px 14px;background:#eaf0ff;color:#34546b;font-size:11px;font-weight:700}
.need-help-body{display:flex;flex-direction:column;gap:8px;padding:14px}
.need-help-body p{margin:0 0 4px;color:#34546b;font-size:13px;line-height:1.4}
.need-help-action{display:block;text-align:center;border-radius:10px;background:#0639b8;color:#fff;text-decoration:none;font-size:13px;font-weight:800;padding:10px 12px}
.need-help-action.is-wa{background:#128c7e}
.need-help-action.is-quiet{background:#eef5f8;color:#145864}
@keyframes need-help-in{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@media (max-width:640px){
  .need-help-panel{right:8px;bottom:48px;width:calc(100vw - 20px)}
}
`;
