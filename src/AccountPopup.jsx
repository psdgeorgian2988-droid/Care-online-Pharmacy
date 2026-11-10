import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function AccountPopup({ title, onClose, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") closeRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  const popup = (
    <div className="profile-service-pop" role="presentation" onClick={() => closeRef.current?.()}>
      <style>{`
        .profile-service-pop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px 16px;background:rgba(20,50,70,.5);box-sizing:border-box}
        .profile-service-sheet{display:flex;flex-direction:column;width:min(980px,100%);max-height:min(860px,calc(100dvh - 40px));overflow:hidden;border-radius:16px;background:#f7fbfe;box-shadow:0 18px 48px rgba(20,50,70,.28)}
        .profile-service-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#fff;border-bottom:1px solid #d7e2e9}
        .profile-service-bar h2{margin:0;font-size:16px;font-weight:800;color:#123b59}
        .profile-service-close{min-height:36px;padding:6px 14px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .profile-service-body{overflow:auto;min-height:0;padding:12px 14px 20px}
      `}</style>
      <div
        className="profile-service-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-service-bar">
          <h2>{title}</h2>
          <button type="button" className="profile-service-close" onClick={() => closeRef.current?.()}>
            Close
          </button>
        </div>
        <div className="profile-service-body">{children}</div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? popup : createPortal(popup, document.body);
}
