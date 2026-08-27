import { useEffect, useRef, useState } from "react";
import {
  CARE_EMAIL,
  CARE_HOURS,
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
  QUICK_PROMPTS,
  newSessionId,
  welcomeMessage,
} from "./careChat";

const SESSION_KEY = "mediHomeCareSession";
const LOCAL_KEY = "mediHomeCareThread";

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    return {
      name: String(parsed?.name || parsed?.fullName || "").trim(),
      mobile: String(parsed?.mobile || parsed?.mobileNumber || "")
        .replace(/\D/g, "")
        .slice(0, 10),
    };
  } catch {
    return { name: "", mobile: "" };
  }
}

function readSessionId() {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = newSessionId();
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return newSessionId();
  }
}

function readLocalThread() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (parsed?.messages?.length) return parsed;
  } catch {
    /* ignore */
  }
  return { messages: [welcomeMessage()] };
}

function writeLocalThread(thread) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(thread));
  } catch {
    /* ignore */
  }
}

export default function CareChat({ open, onOpen, onClose }) {
  const [sessionId] = useState(readSessionId);
  const [thread, setThread] = useState(readLocalThread);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scroller = useRef(null);

  const syncThread = async () => {
    try {
      const data = await fetch(
        `/api/care/thread?sessionId=${encodeURIComponent(sessionId)}${open ? "&ack=1" : ""}`
      ).then((res) => res.json());
      if (data?.thread?.messages?.length) {
        setThread(data.thread);
        writeLocalThread(data.thread);
        if (!open && data.thread.unreadCustomer) {
          setUnread((count) => count + 1);
        }
      }
    } catch {
      /* stay on local copy */
    }
  };

  useEffect(() => {
    syncThread();
  }, [sessionId]);

  useEffect(() => {
    if (!open) return undefined;
    setUnread(0);
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const timer = setInterval(syncThread, 8000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(timer);
    };
  }, [open, onClose, sessionId]);

  useEffect(() => {
    if (!open) return;
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, thread.messages?.length]);

  const sendText = async (text) => {
    const body = String(text || "").trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const optimistic = {
      ...thread,
      messages: [
        ...(thread.messages || []),
        { id: `local-${Date.now()}`, from: "user", text: body, at: Date.now() },
      ],
    };
    setThread(optimistic);
    writeLocalThread(optimistic);
    try {
      const profile = readProfile();
      const data = await fetch("/api/care/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          text: body,
          name: profile.name,
          mobile: profile.mobile,
        }),
      }).then((res) => res.json());
      if (data?.thread) {
        setThread(data.thread);
        writeLocalThread(data.thread);
      }
    } catch {
      /* keep optimistic local messages */
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendText(draft);
  };

  return (
    <>
      <style>{styles}</style>
      {!open ? (
        <button
          type="button"
          className="care-fab"
          onClick={onOpen}
          aria-label="Open customer care chat"
        >
          Chat with care
          {unread ? (
            <span className="care-fab-badge">{unread > 9 ? "9+" : unread}</span>
          ) : null}
        </button>
      ) : null}

      {open ? (
        <section className="care-chat" role="dialog" aria-labelledby="care-chat-title">
          <header className="care-chat-head">
            <div>
              <p>MediHome care</p>
              <h2 id="care-chat-title">Customer care chat</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close chat">
              ×
            </button>
          </header>
          <p className="care-chat-hours">{CARE_HOURS}</p>
          <div className="care-phone-row">
            <span>Customer Care No</span>
            <strong>
              <a href={`tel:${CARE_PHONE_TEL}`}>{CARE_PHONE_DISPLAY}</a>
            </strong>
            <div>
              <a className="care-phone-btn" href={`tel:${CARE_PHONE_TEL}`}>
                Call
              </a>
              <a
                className="care-phone-btn is-wa"
                href={CARE_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>
          <div className="care-chat-log" ref={scroller}>
            {(thread.messages || []).map((row) => (
              <article key={row.id} className={`care-bubble is-${row.from}`}>
                <p>{row.text}</p>
                {row.links?.length ? (
                  <div className="care-bubble-links">
                    {row.links.map((link) => (
                      <a
                        key={`${row.id}-${link.href}`}
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        onClick={link.href.startsWith("#") ? onClose : undefined}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <div className="care-quick">
            <a className="care-quick-call" href={`tel:${CARE_PHONE_TEL}`}>
              Call {CARE_PHONE_DISPLAY}
            </a>
            {QUICK_PROMPTS.map((row) => (
              <button key={row.label} type="button" onClick={() => sendText(row.text)}>
                {row.label}
              </button>
            ))}
          </div>
          <form className="care-compose" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="care-draft">
              Message
            </label>
            <input
              id="care-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
          <p className="care-chat-foot">
            Same number as Contact Us:{" "}
            <a href={`tel:${CARE_PHONE_TEL}`}>{CARE_PHONE_DISPLAY}</a>
            {" · "}
            <a href={`mailto:${CARE_EMAIL}`}>{CARE_EMAIL}</a>
            {" · "}
            <a href={CARE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </p>
        </section>
      ) : null}
    </>
  );
}

const styles = `
.care-fab{position:fixed;right:18px;bottom:18px;z-index:80;border:0;border-radius:999px;background:#1a6b7a;color:#fff;font:inherit;font-size:14px;font-weight:800;padding:12px 16px;box-shadow:0 10px 24px rgba(20,50,70,.22);cursor:pointer}
.care-fab-badge{margin-left:8px;display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;border-radius:99px;background:#c44b4b;font-size:11px}
.care-chat{position:fixed;right:18px;bottom:18px;z-index:90;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;border:1px solid #d7e6ee;border-radius:16px;box-shadow:0 16px 40px rgba(20,50,70,.2);overflow:hidden}
.care-chat-head{display:flex;justify-content:space-between;gap:8px;padding:12px 14px;background:#1a6b7a;color:#fff}
.care-chat-head p{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.care-chat-head h2{margin:2px 0 0;font-size:16px}
.care-chat-head button{border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.care-chat-hours{margin:0;padding:6px 14px;background:#eaf7ff;color:#34546b;font-size:11px;font-weight:700}
.care-phone-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:8px 14px;border-bottom:1px solid #d7e6ee;background:#fff}
.care-phone-row span{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.care-phone-row strong{font-size:14px}
.care-phone-row strong a{color:#143246;text-decoration:none}
.care-phone-row div{display:flex;gap:6px;margin-left:auto}
.care-phone-btn{border-radius:99px;background:#0639b8;color:#fff;text-decoration:none;font-size:12px;font-weight:800;padding:5px 10px}
.care-phone-btn.is-wa{background:#128c7e}
.care-quick-call{border:1px solid #0639b8;border-radius:99px;background:#eaf0ff;color:#0639b8;text-decoration:none;font-size:11px;font-weight:800;padding:5px 8px}
.care-chat-log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f6fafc;min-height:220px}
.care-bubble{max-width:86%;padding:8px 10px;border-radius:12px;font-size:13px;line-height:1.4}
.care-bubble p{margin:0}
.care-bubble.is-user{align-self:flex-end;background:#1a6b7a;color:#fff}
.care-bubble.is-bot,.care-bubble.is-staff{align-self:flex-start;background:#fff;border:1px solid #e4ecef;color:#143246}
.care-bubble.is-staff{border-color:#b7e0c8}
.care-bubble-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.care-bubble-links a{border-radius:99px;background:#e7f1f6;color:#1a6b7a;text-decoration:none;font-size:11px;font-weight:800;padding:4px 8px}
.care-quick{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid #edf1f3}
.care-quick button{border:1px solid #d7e2e9;border-radius:99px;background:#fff;color:#1a6b7a;font:inherit;font-size:11px;font-weight:700;padding:5px 8px;cursor:pointer}
.care-compose{display:flex;gap:6px;padding:8px 12px}
.care-compose input{flex:1;min-height:38px;border:1px solid #d7e2e9;border-radius:10px;padding:0 10px;font:inherit}
.care-compose button{border:0;border-radius:10px;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;padding:0 12px;cursor:pointer}
.care-compose button:disabled{opacity:.5;cursor:default}
.care-chat-foot{margin:0;padding:0 12px 10px;color:#5d7180;font-size:11px}
.care-chat-foot a{color:#1a6b7a;font-weight:700;text-decoration:none}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
@media (max-width:640px){
  .care-fab,.care-chat{right:10px;bottom:10px}
}
`;
