import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiBase.js";
import {
  CARE_EMAIL,
  CARE_HOURS,
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP_URL,
  MEDIBOT_NAME,
  OPEN_MEDIBOT_EVENT,
  QUICK_PROMPTS,
  newMessageId,
  newSessionId,
  replyTo,
  welcomeMessage,
} from "./careChat";

const SESSION_KEY = "mediHomeCareSession";
const LOCAL_KEY = "mediHomeCareThread";
const POS_KEY = "mediHomeMediBotPos";
const BUBBLE_SIZE = 56;

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

function fixedBubblePos() {
  if (typeof window === "undefined") {
    return { left: 16, top: 16 };
  }
  const fab = document.querySelector(".site-floating-help .care-fab, .care-fab");
  if (fab) {
    const rect = fab.getBoundingClientRect();
    return { left: Math.round(rect.left), top: Math.round(rect.top) };
  }
  const right = Math.max(8, window.innerWidth - BUBBLE_SIZE - 10);
  return {
    left: right,
    top: Math.max(8, window.innerHeight - BUBBLE_SIZE - 48),
  };
}

function writeBubblePos(pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function appendMediBotReply(thread, userText) {
  const reply = replyTo(userText);
  return {
    ...thread,
    messages: [
      ...(thread.messages || []),
      {
        id: newMessageId(),
        from: "bot",
        text: reply.text,
        at: Date.now(),
        links: reply.links || [],
        needsStaff: Boolean(reply.needsStaff),
      },
    ],
  };
}

export default function CareChat() {
  const [sessionId] = useState(readSessionId);
  const [thread, setThread] = useState(readLocalThread);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState(fixedBubblePos);
  const scroller = useRef(null);
  const closeTimer = useRef(0);

  const syncThread = async () => {
    try {
      const data = await apiFetch(
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
    const place = () => {
      const next = fixedBubblePos();
      setPos(next);
      writeBubblePos(next);
    };
    place();
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("hashchange", place);
    const stack = document.querySelector(".site-floating-help");
    const ro =
      typeof ResizeObserver !== "undefined" && stack
        ? new ResizeObserver(place)
        : null;
    ro?.observe(stack);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("hashchange", place);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    syncThread();
  }, [sessionId]);

  useEffect(() => {
    if (!open) return undefined;
    setUnread(0);
    const onKey = (event) => {
      if (event.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onKey);
    const timer = setInterval(syncThread, 8000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(timer);
    };
  }, [open, sessionId]);

  useEffect(() => {
    if (!visible) return;
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [visible, thread.messages?.length]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const openChat = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = 0;
    }
    setVisible(true);
    requestAnimationFrame(() => setOpen(true));
  };

  useEffect(() => {
    const onOpenRequest = () => openChat();
    window.addEventListener(OPEN_MEDIBOT_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_MEDIBOT_EVENT, onOpenRequest);
  }, []);

  const closeChat = () => {
    setOpen(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setVisible(false);
      closeTimer.current = 0;
    }, 280);
  };

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
      const data = await apiFetch("/api/care/messages", {
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
      } else {
        const local = appendMediBotReply(optimistic, body);
        setThread(local);
        writeLocalThread(local);
      }
    } catch {
      const local = appendMediBotReply(optimistic, body);
      setThread(local);
      writeLocalThread(local);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendText(draft);
  };

  const panelWidth =
    typeof window === "undefined" ? 380 : Math.min(380, window.innerWidth - 16);
  const panelStyle =
    typeof window === "undefined"
      ? undefined
      : {
          left: Math.min(
            Math.max(8, pos.left + BUBBLE_SIZE - panelWidth),
            Math.max(8, window.innerWidth - panelWidth - 8)
          ),
          bottom: Math.max(12, window.innerHeight - pos.top + 10),
        };

  return (
    <>
      <style>{styles}</style>
      <button
        type="button"
        className="care-fab"
        aria-label={`Open ${MEDIBOT_NAME}`}
        title={MEDIBOT_NAME}
        onClick={openChat}
      >
        <img
          className="care-fab-img"
          src="/app/medibot-bubble.png"
          alt=""
          draggable={false}
        />
        <span className="sr-only">{MEDIBOT_NAME}</span>
        {unread ? (
          <span className="care-fab-badge">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>

      {visible ? (
        <section
          className={`care-chat${open ? " is-open" : " is-closing"}`}
          role="dialog"
          aria-labelledby="care-chat-title"
          style={panelStyle}
        >
          <header className="care-chat-head">
            <div>
              <p>MediHome AI assistant</p>
              <h2 id="care-chat-title">{MEDIBOT_NAME}</h2>
            </div>
            <button type="button" onClick={closeChat} aria-label="Close MediBot">
              ×
            </button>
          </header>
          <p className="care-chat-hours">
            {MEDIBOT_NAME} helps with MediHome usage · Care hours {CARE_HOURS}
          </p>
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
                {row.from === "bot" ? (
                  <p className="care-bubble-label">{MEDIBOT_NAME}</p>
                ) : null}
                <p>{row.text}</p>
                {row.links?.length ? (
                  <div className="care-bubble-links">
                    {row.links.map((link) => (
                      <a
                        key={`${row.id}-${link.href}`}
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        onClick={link.href.startsWith("#") ? closeChat : undefined}
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
              Message MediBot
            </label>
            <input
              id="care-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Ask ${MEDIBOT_NAME} about MediHome…`}
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
          <p className="care-chat-foot">
            If {MEDIBOT_NAME} cannot help, call{" "}
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
.care-fab{position:relative;z-index:80;width:${BUBBLE_SIZE}px;height:${BUBBLE_SIZE}px;padding:0;border:2px solid #ffffff;border-radius:999px;background:#1a6b7a;box-shadow:0 8px 20px rgba(20,50,70,.28);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;overflow:visible;user-select:none;flex-shrink:0}
.care-fab-img{display:block;width:100%;height:100%;object-fit:cover;border-radius:999px;pointer-events:none}
.care-fab-badge{position:absolute;top:-2px;right:-2px;display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;border-radius:99px;background:#c44b4b;color:#fff;font-size:10px;font-weight:800;border:2px solid #fff}
.care-chat{position:fixed;z-index:90;width:min(380px,calc(100vw - 32px));max-height:min(70vh,560px);display:flex;flex-direction:column;background:#fff;border:1px solid #d7e6ee;border-radius:12px;box-shadow:0 16px 40px rgba(20,50,70,.2);overflow:hidden;transform-origin:bottom right;opacity:0;transform:translateY(14px) scale(.94);pointer-events:none}
.care-chat.is-open{animation:care-chat-in .3s ease forwards;pointer-events:auto}
.care-chat.is-closing{animation:care-chat-out .28s ease forwards;pointer-events:none}
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
.care-chat-log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f6fafc;min-height:180px}
.care-bubble{max-width:86%;padding:8px 10px;border-radius:12px;font-size:13px;line-height:1.4}
.care-bubble p{margin:0}
.care-bubble-label{margin:0 0 4px!important;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
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
@keyframes care-chat-in{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes care-chat-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(12px) scale(.96)}}
@media (prefers-reduced-motion:reduce){
  .care-chat.is-open,.care-chat.is-closing{animation:none;opacity:1;transform:none;pointer-events:auto}
}
`;
