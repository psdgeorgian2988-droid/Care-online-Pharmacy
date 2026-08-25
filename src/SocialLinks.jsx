import { SOCIAL } from "./siteMeta";

const ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-5 3.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 2A1.8 1.8 0 1 0 13.8 12 1.8 1.8 0 0 0 12 10.2zM17.4 6.6a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z"
      />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z"
      />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23 12.2s0-3.2-.4-4.6c-.2-.8-.9-1.5-1.7-1.7C19.2 5.5 12 5.5 12 5.5s-7.2 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.8.9 1.5 1.7 1.7 1.7.4 8.9.4 8.9.4s7.2 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.6.4-4.6zM9.8 15.5v-6.6l6.3 3.3-6.3 3.3z"
      />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.7 9.3H4V20h2.7V9.3zM5.3 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM20 20h-2.7v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V20H11V9.3h2.6v1.5h.1c.4-.7 1.3-1.7 2.8-1.7 3 0 3.5 2 3.5 4.5V20z"
      />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.6 3H20l-6.2 7.1L21 21h-5.5l-4.3-5.6L6.2 21H4l6.6-7.6L3.2 3h5.6l3.9 5.2L17.6 3zm-1 16.2h1.5L7.5 4.7H5.9l10.7 14.5z"
      />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4 0-.4.1-.6l.4-.4.1-.3a.4.4 0 0 0 0-.4c0-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.4a.8.8 0 0 0-.6.3 2.5 2.5 0 0 0-.8 1.9 4.4 4.4 0 0 0 .9 2.3 10 10 0 0 0 4 3.6 4.5 4.5 0 0 0 2.1.6 2 2 0 0 0 1.3-.6 1.7 1.7 0 0 0 .4-1.1c0-.1 0-.2-.2-.3z"
      />
    </svg>
  ),
};

export default function SocialLinks({ className = "", showHandles = false }) {
  return (
    <nav className={`social-links ${className}`.trim()} aria-label="MediHome on social media">
      {SOCIAL.map((item) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer me"
          title={`${item.label} ${item.handle}`}
        >
          {ICONS[item.id]}
          {showHandles ? (
            <span>
              {item.label} {item.handle}
            </span>
          ) : (
            <span className="sr-only">{item.label}</span>
          )}
        </a>
      ))}
    </nav>
  );
}
