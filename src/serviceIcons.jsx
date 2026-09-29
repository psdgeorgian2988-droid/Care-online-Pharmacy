/** Shared line icons for footer, My Orders, and Medical Record cards. */

export const SERVICE_ICON_TONES = {
  account: { color: "#4f6f8f", bg: "#e4ebf2" },
  medicine: { color: "#2f8a7b", bg: "#d7f1ec" },
  lab: { color: "#c4892b", bg: "#fff1d4" },
  orders: { color: "#1a6b7a", bg: "#d9eef2" },
  doctor: { color: "#c45d6a", bg: "#fde8eb" },
  record: { color: "#4a6fa5", bg: "#e6eef8" },
  homecare: { color: "#c4893b", bg: "#fff0d6" },
  vaccination: { color: "#3d9a55", bg: "#def3e3" },
  radiology: { color: "#5a7dbf", bg: "#e6eefc" },
  psychologist: { color: "#7a6fbf", bg: "#eee8ff" },
  stepdown: { color: "#5a7a8f", bg: "#e6eef2" },
  ambulance: { color: "#c45c5c", bg: "#ffe6e6" },
};

const TYPE_ALIASES = {
  account: "account",
  medicines: "medicine",
  medicine: "medicine",
  vitamins: "medicine",
  labs: "lab",
  lab: "lab",
  blood: "lab",
  orders: "orders",
  doctor: "doctor",
  record: "record",
  reports: "record",
  "medical-record": "record",
  prescription: "record",
  homecare: "homecare",
  "home-care": "homecare",
  nurse: "homecare",
  vaccination: "vaccination",
  "vax-adult": "vaccination",
  radiology: "radiology",
  imaging: "radiology",
  mri: "radiology",
  psychologist: "psychologist",
  video: "psychologist",
  stepdown: "stepdown",
  "step-down": "stepdown",
  icu: "stepdown",
  ambulance: "ambulance",
};

export function serviceIconType(type = "") {
  return TYPE_ALIASES[String(type || "").toLowerCase()] || "medicine";
}

export function serviceIconTone(type = "") {
  return SERVICE_ICON_TONES[serviceIconType(type)] || SERVICE_ICON_TONES.medicine;
}

function glyph(type, color) {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const wash = { fill: color, fillOpacity: 0.14, stroke: color, strokeWidth: 1.8, strokeLinejoin: "round" };

  switch (serviceIconType(type)) {
    case "account":
      return (
        <>
          <circle cx="12" cy="8" r="3.2" {...wash} />
          <path d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5" {...stroke} />
        </>
      );
    case "medicine":
      return (
        <>
          <rect x="7" y="3.5" width="10" height="17" rx="5" {...wash} />
          <path d="M12 8v8M8.5 12h7" {...stroke} />
        </>
      );
    case "lab":
      return (
        <path
          d="M9 3.5h6M10 3.5v5.2L6.2 16.8A3.2 3.2 0 0 0 9 21.5h6a3.2 3.2 0 0 0 2.8-4.7L14 8.7V3.5"
          {...wash}
        />
      );
    case "orders":
      return (
        <>
          <path d="M7 7.5h10l1.4 11H5.6z" {...wash} />
          <path d="M9 7.5V6.2A3 3 0 0 1 12 3.2 3 3 0 0 1 15 6.2v1.3" {...stroke} />
        </>
      );
    case "doctor":
      return (
        <>
          <circle cx="12" cy="7.2" r="2.6" {...wash} />
          <path d="M7 20.2v-2.4c0-2.2 2.2-4 5-4s5 1.8 5 4v2.4" {...stroke} />
          <path d="M18.2 8.2v4.2M16.1 10.3h4.2" {...stroke} />
        </>
      );
    case "record":
      return (
        <>
          <path d="M7 4.5h7.2L18.5 8v11.5H7z" {...wash} />
          <path d="M14 4.6V8h3.6M9 12h6M9 15.5h6" {...stroke} />
        </>
      );
    case "homecare":
      return (
        <path
          d="M4.5 11.2 12 5.2l7.5 6V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2h-3.6v5.2H6A1.5 1.5 0 0 1 4.5 19z"
          {...wash}
        />
      );
    case "vaccination":
      return (
        <>
          <path d="m8.2 15.8 6.6-6.6M14 6.6l3.4 3.4M16.2 5.2l2.6 2.6M7.4 16.6 5.2 18.8" {...stroke} />
          <path d="M9.4 9.8h4.8v4.8" {...stroke} />
        </>
      );
    case "radiology":
      return (
        <>
          <rect x="5" y="4.2" width="14" height="15.6" rx="2.2" {...wash} />
          <path d="M12 8v8M8.6 11.2h6.8M9.6 15h4.8" {...stroke} />
        </>
      );
    case "psychologist":
      return (
        <>
          <circle cx="8.6" cy="8" r="2.5" {...wash} />
          <path d="M5.2 18.6v-2.1c0-1.7 1.5-3.1 3.4-3.1" {...stroke} />
          <path d="M12.6 9.4h6a1.6 1.6 0 0 1 1.6 1.6v3.4a1.6 1.6 0 0 1-1.6 1.6H17l-2.2 2v-2h-2.2a1.6 1.6 0 0 1-1.6-1.6v-3.4a1.6 1.6 0 0 1 1.6-1.6z" {...wash} />
        </>
      );
    case "stepdown":
      return (
        <>
          <path d="M4.2 16.4V12a2 2 0 0 1 2-2h7.2V8.4A2 2 0 0 1 15.4 6.4h2.2" {...stroke} />
          <path d="M4.2 16.4h15.6" {...stroke} />
          <path d="M6.6 16.4v2.3M17.4 16.4v2.3" {...stroke} />
          <rect x="13.6" y="10" width="5.2" height="4.2" rx="1" {...wash} />
        </>
      );
    case "ambulance":
      return (
        <>
          <path d="M3.4 14.6h13.2V8.4H9.6L7.2 11H3.4z" {...wash} />
          <path d="M16.6 14.6h2.4l1.6-3.2H16.6z" {...stroke} />
          <circle cx="7.4" cy="16.8" r="1.7" {...stroke} />
          <circle cx="15.2" cy="16.8" r="1.7" {...stroke} />
          <path d="M8.4 10.2h3.2M10 8.6v3.2" {...stroke} />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="6" {...wash} />;
  }
}

export function ServiceGlyph({ type = "medicine", color }) {
  const tone = serviceIconTone(type);
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {glyph(type, color || tone.color)}
    </svg>
  );
}

export default function ServiceIcon({ type = "medicine", title = "", className = "" }) {
  const resolved = serviceIconType(type);
  const tone = serviceIconTone(resolved);
  return (
    <span
      className={`service-icon${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      data-icon={resolved}
      title={title || undefined}
      style={{ color: tone.color, background: tone.bg }}
    >
      <ServiceGlyph type={resolved} color={tone.color} />
    </span>
  );
}
