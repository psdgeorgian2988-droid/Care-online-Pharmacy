import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_MS = 280;
const popupClosers = [];
const popupLayers = [];

export default function AccountPopup({ title, onClose, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const popRef = useRef(null);
  const finished = useRef(false);
  const closingRef = useRef(false);
  const layerRef = useRef(null);
  if (layerRef.current == null) {
    const level = popupLayers.length;
    layerRef.current = { level };
    popupLayers.push(layerRef.current);
  }
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);

  const finishClose = () => {
    if (finished.current) return;
    finished.current = true;
    closeRef.current?.();
  };

  const requestClose = () => {
    if (finished.current || closingRef.current) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finishClose();
      return;
    }
    closingRef.current = true;
    setClosing(true);
  };

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!closing) return undefined;
    const timer = window.setTimeout(finishClose, CLOSE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (popupClosers[popupClosers.length - 1] !== requestClose) return;
      requestClose();
    };
    popupClosers.push(requestClose);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const layer = layerRef.current;
    if (layer && !popupLayers.includes(layer)) popupLayers.push(layer);
    return () => {
      const layerIndex = popupLayers.indexOf(layer);
      if (layerIndex >= 0) popupLayers.splice(layerIndex, 1);
      const index = popupClosers.lastIndexOf(requestClose);
      if (index >= 0) popupClosers.splice(index, 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      const node = popRef.current;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!node || finished.current || reduce || !node.classList.contains("is-shown")) return;
      const clone = node.cloneNode(true);
      clone.classList.add("is-leaving");
      clone.style.pointerEvents = "none";
      document.body.appendChild(clone);
      window.requestAnimationFrame(() => clone.classList.add("is-closing"));
      window.setTimeout(() => clone.remove(), CLOSE_MS + 40);
    };
  }, []);

  const popup = (
    <div
      ref={popRef}
      className={`profile-service-pop${shown ? " is-shown" : ""}${closing ? " is-closing" : ""}`}
      style={{ zIndex: 1200 + layerRef.current.level * 20 }}
      role="presentation"
      onClick={requestClose}
    >
      <style>{`
        .profile-service-pop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px 16px;background:rgba(20,50,70,0);box-sizing:border-box;pointer-events:none;transition:background .28s ease}
        .profile-service-pop.is-shown{background:rgba(20,50,70,.5);pointer-events:auto}
        .profile-service-pop.is-closing{background:rgba(20,50,70,0)}
        .profile-service-sheet{display:flex;flex-direction:column;width:min(980px,100%);max-height:min(860px,calc(100dvh - 40px));overflow:hidden;border-radius:16px;background:#f7fbfe;box-shadow:0 18px 48px rgba(20,50,70,.28);opacity:0;transform:translateY(28px) scale(.96);transition:opacity .28s ease, transform .32s cubic-bezier(.2,.8,.2,1)}
        .profile-service-pop.is-shown .profile-service-sheet{opacity:1;transform:translateY(0) scale(1)}
        .profile-service-pop.is-closing,.profile-service-pop.is-leaving{pointer-events:none}
        .profile-service-pop.is-closing .profile-service-sheet{opacity:0;transform:translateY(22px) scale(.98);transition-duration:.24s}
        .profile-service-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#fff;border-bottom:1px solid #d7e2e9}
        .profile-service-bar h2{margin:0;font-size:16px;font-weight:800;color:#123b59}
        .profile-service-close{min-height:36px;padding:6px 14px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .profile-service-body{overflow:auto;min-height:0;padding:12px 14px 20px}
        @media (prefers-reduced-motion: reduce){
          .profile-service-pop,.profile-service-sheet{transition:none}
          .profile-service-pop{background:rgba(20,50,70,.5)}
          .profile-service-sheet{opacity:1;transform:none}
        }
      `}</style>
      <div
        className="profile-service-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
          if (closingRef.current) finishClose();
        }}
      >
        <div className="profile-service-bar">
          <h2>{title}</h2>
          <button type="button" className="profile-service-close" onClick={requestClose}>
            Close
          </button>
        </div>
        <div className="profile-service-body">{children}</div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? popup : createPortal(popup, document.body);
}
