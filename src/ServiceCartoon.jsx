/** Compact cartoon characters for home sub-services. */
export default function ServiceCartoon({ type = "nurse", title = "" }) {
  const label = title || "Service";
  return (
    <span className="service-cartoon" aria-hidden="true" data-cartoon={type}>
      <svg viewBox="0 0 80 80" role="img" focusable="false">
        <title>{label}</title>
        <circle cx="40" cy="40" r="38" fill={bgFor(type)} />
        {bodyFor(type)}
      </svg>
    </span>
  );
}

function bgFor(type) {
  const map = {
    diabetes: "#ffe8d6",
    heart: "#ffd6e0",
    pain: "#e8f0ff",
    vitamins: "#e6f7e9",
    infection: "#efe6ff",
    women: "#ffe6f2",
    blood: "#ffe0e0",
    thyroid: "#fff3d6",
    liver: "#e8f6e8",
    kidney: "#e6f0ff",
    mri: "#e8eefc",
    ct: "#eef2f7",
    ultrasound: "#e6f7f5",
    xray: "#f0f0f5",
    mammo: "#ffe8f0",
    nurse: "#d9f3f0",
    caregiver: "#fff0d9",
    physio: "#e4f2ff",
    "vax-adult": "#e8f8e8",
    "vax-child": "#fff4d9",
    record: "#eef2ff",
    video: "#e8f4ff",
    followup: "#f0e8ff",
    child: "#fff6d6",
    couple: "#ffe8f0",
    "home-visit": "#e8f6f0",
    icu: "#e8eef8",
    surgery: "#ffe8e8",
    wound: "#fff0e6",
    ambulance: "#ffe6e6",
    transfer: "#e8f0ff",
    report: "#eef6ff",
    guide: "#e8f7ef",
    webinar: "#ebe8ff",
    quiz: "#fff6e0",
    refer: "#e6f7f2",
    search: "#dff3f6",
  };
  return map[type] || "#e8f4f2";
}

function Face({ cx = 40, cy = 28, skin = "#f7c9a3" }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="12" fill={skin} />
      <circle cx={cx - 4} cy={cy - 1} r="1.4" fill="#2a3d4a" />
      <circle cx={cx + 4} cy={cy - 1} r="1.4" fill="#2a3d4a" />
      <path
        d={`M${cx - 3.5} ${cy + 4.5} Q${cx} ${cy + 7.5} ${cx + 3.5} ${cy + 4.5}`}
        fill="none"
        stroke="#c47a5a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  );
}

function bodyFor(type) {
  switch (type) {
    case "nurse":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#1a6b7a" />
          <circle cx="40" cy="52" r="5" fill="#fff" />
          <path d="M40 49 v6 M37 52 h6" stroke="#1a6b7a" strokeWidth="2" />
          <rect x="28" y="18" width="24" height="6" rx="3" fill="#fff" />
        </g>
      );
    case "caregiver":
      return (
        <g>
          <Face cy={26} />
          <path d="M22 42 h36 l-5 24 H27 Z" fill="#d9893b" />
          <circle cx="52" cy="58" r="7" fill="#f7c9a3" />
          <path d="M46 56 h8" stroke="#c47a5a" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case "physio":
      return (
        <g>
          <Face cy={24} />
          <path d="M26 40 h28 l-3 24 H29 Z" fill="#3e7ea3" />
          <rect x="18" y="48" width="14" height="4" rx="2" fill="#2a3d4a" transform="rotate(-25 25 50)" />
          <circle cx="58" cy="54" r="6" fill="#ffd76a" />
        </g>
      );
    case "ambulance":
      return (
        <g>
          <rect x="12" y="34" width="52" height="24" rx="6" fill="#e85d5d" />
          <rect x="42" y="28" width="18" height="16" rx="3" fill="#c94444" />
          <rect x="46" y="32" width="10" height="8" rx="1" fill="#b8e8ff" />
          <circle cx="24" cy="58" r="6" fill="#2a3d4a" />
          <circle cx="54" cy="58" r="6" fill="#2a3d4a" />
          <path d="M34 40 h12 M40 34 v12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "transfer":
      return (
        <g>
          <rect x="14" y="36" width="48" height="20" rx="5" fill="#4f7cac" />
          <circle cx="26" cy="58" r="5" fill="#2a3d4a" />
          <circle cx="52" cy="58" r="5" fill="#2a3d4a" />
          <path d="M28 46 h24" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M46 42 l6 4 -6 4" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "blood":
      return (
        <g>
          <Face cy={22} />
          <path d="M28 40 h24 l-3 24 H31 Z" fill="#fff" />
          <path d="M40 18 C40 18 28 34 28 42 a12 12 0 0 0 24 0 C52 34 40 18 40 18 Z" fill="#e85d5d" transform="translate(0 28) scale(0.45) translate(48 -20)" />
          <ellipse cx="40" cy="54" rx="7" ry="9" fill="#e85d5d" />
        </g>
      );
    case "diabetes":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#5a9e6f" />
          <rect x="34" y="48" width="12" height="16" rx="3" fill="#fff" />
          <circle cx="40" cy="54" r="2" fill="#e85d5d" />
        </g>
      );
    case "heart":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#d96b8a" />
          <path d="M40 50 C36 46 30 50 34 55 L40 60 L46 55 C50 50 44 46 40 50 Z" fill="#fff" />
        </g>
      );
    case "pain":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#6b8fc2" />
          <circle cx="40" cy="54" r="8" fill="#fff" />
          <text x="40" y="58" textAnchor="middle" fontSize="12" fontWeight="700" fill="#6b8fc2">
            +
          </text>
        </g>
      );
    case "vitamins":
      return (
        <g>
          <rect x="26" y="22" width="28" height="40" rx="8" fill="#6fbf7a" />
          <rect x="30" y="28" width="20" height="10" rx="3" fill="#fff" />
          <circle cx="40" cy="50" r="6" fill="#ffd76a" />
        </g>
      );
    case "infection":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#8b6fc2" />
          <circle cx="40" cy="54" r="7" fill="#fff" stroke="#8b6fc2" strokeWidth="2" />
          <path d="M40 50 v8 M36 54 h8" stroke="#8b6fc2" strokeWidth="2" />
        </g>
      );
    case "women":
      return (
        <g>
          <Face skin="#f0c2b0" />
          <path d="M24 44 h32 l-6 22 H30 Z" fill="#d96b9a" />
          <circle cx="40" cy="54" r="5" fill="#fff" />
        </g>
      );
    case "thyroid":
      return (
        <g>
          <Face cy={24} />
          <path d="M26 40 h28 l-3 24 H29 Z" fill="#c9a227" />
          <ellipse cx="40" cy="52" rx="10" ry="6" fill="#fff" opacity="0.9" />
        </g>
      );
    case "liver":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#6f9e5a" />
          <path d="M30 52 Q40 46 50 54 Q42 62 32 58 Z" fill="#fff" />
        </g>
      );
    case "kidney":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#5a7dbf" />
          <ellipse cx="34" cy="54" rx="5" ry="8" fill="#fff" />
          <ellipse cx="46" cy="54" rx="5" ry="8" fill="#fff" />
        </g>
      );
    case "mri":
    case "ct":
      return (
        <g>
          <ellipse cx="40" cy="42" rx="24" ry="20" fill="#9eb6d9" />
          <ellipse cx="40" cy="42" rx="14" ry="12" fill="#dfe8f5" />
          <Face cy={42} />
        </g>
      );
    case "ultrasound":
      return (
        <g>
          <Face cy={26} />
          <path d="M24 42 h32 l-4 24 H28 Z" fill="#2f8a7b" />
          <rect x="48" y="46" width="14" height="8" rx="2" fill="#fff" />
          <path d="M55 54 v8" stroke="#fff" strokeWidth="2" />
        </g>
      );
    case "xray":
      return (
        <g>
          <rect x="18" y="16" width="44" height="50" rx="6" fill="#d9dee8" />
          <path d="M40 24 v34 M28 36 h24 M32 48 h16" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "mammo":
      return (
        <g>
          <Face skin="#f0c2b0" />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#d989a8" />
          <circle cx="40" cy="54" r="7" fill="#fff" />
        </g>
      );
    case "vax-adult":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#2f8a7b" />
          <rect x="50" y="30" width="8" height="22" rx="2" fill="#c5d4de" />
          <rect x="52" y="24" width="4" height="8" fill="#8aa0b0" />
        </g>
      );
    case "vax-child":
      return (
        <g>
          <Face cy={30} skin="#f7c9a3" />
          <circle cx="40" cy="18" r="6" fill="#ffd76a" />
          <path d="M26 46 h28 l-3 20 H29 Z" fill="#f0a45a" />
        </g>
      );
    case "record":
      return (
        <g>
          <rect x="20" y="16" width="40" height="50" rx="4" fill="#fff" />
          <rect x="20" y="16" width="40" height="10" rx="4" fill="#1a6b7a" />
          <path d="M28 36 h24 M28 44 h20 M28 52 h16" stroke="#1a6b7a" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "video":
      return (
        <g>
          <Face cy={26} />
          <rect x="18" y="42" width="34" height="22" rx="4" fill="#3e7ea3" />
          <path d="M52 48 l12 -6 v18 l-12 -6 Z" fill="#2a5f7a" />
        </g>
      );
    case "followup":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#7a6fbf" />
          <circle cx="40" cy="54" r="7" fill="#fff" />
          <path d="M37 54 h6" stroke="#7a6fbf" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "child":
      return (
        <g>
          <Face cy={30} />
          <circle cx="28" cy="22" r="4" fill="#f7c9a3" />
          <circle cx="52" cy="22" r="4" fill="#f7c9a3" />
          <path d="M26 48 h28 l-3 18 H29 Z" fill="#5a9ed9" />
        </g>
      );
    case "couple":
      return (
        <g>
          <circle cx="30" cy="28" r="10" fill="#f7c9a3" />
          <circle cx="50" cy="28" r="10" fill="#f0c2b0" />
          <path d="M16 44 h28 l-3 22 H19 Z" fill="#3e7ea3" />
          <path d="M40 44 h24 l-3 22 H43 Z" fill="#d96b9a" />
        </g>
      );
    case "home-visit":
      return (
        <g>
          <path d="M40 14 L64 34 H54 V62 H26 V34 H16 Z" fill="#1a6b7a" />
          <rect x="34" y="42" width="12" height="20" fill="#ffd76a" />
        </g>
      );
    case "icu":
      return (
        <g>
          <rect x="16" y="28" width="48" height="30" rx="4" fill="#fff" />
          <path d="M22 42 h10 l4 -8 6 16 4 -10 8 6" fill="none" stroke="#e85d5d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Face cy={20} />
        </g>
      );
    case "surgery":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#6b8a9e" />
          <rect x="48" y="36" width="16" height="4" rx="1" fill="#c5d4de" transform="rotate(35 56 38)" />
        </g>
      );
    case "wound":
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#fff" />
          <path d="M32 52 h16" stroke="#e85d5d" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 48 h12 M34 56 h12" stroke="#f0a0a0" strokeWidth="2" />
        </g>
      );
    case "report":
      return (
        <g>
          <rect x="22" y="14" width="36" height="50" rx="4" fill="#fff" stroke="#1a6b7a" strokeWidth="2" />
          <path d="M30 28 h20 M30 36 h20 M30 44 h14" stroke="#1a6b7a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="48" cy="52" r="8" fill="#2f8a7b" />
          <path d="M44 52 l3 3 6 -7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "guide":
      return (
        <g>
          <path d="M20 18 h18 v44 H24 a4 4 0 0 1 -4 -4 Z" fill="#1a6b7a" />
          <path d="M40 18 h20 v40 a4 4 0 0 1 -4 4 H40 Z" fill="#2f8a7b" />
          <path d="M28 28 h6 M28 36 h6 M46 28 h8 M46 36 h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "webinar":
      return (
        <g>
          <rect x="14" y="22" width="52" height="34" rx="4" fill="#5a4fbf" />
          <polygon points="34,32 34,48 48,40" fill="#fff" />
          <rect x="30" y="58" width="20" height="4" rx="2" fill="#2a3d4a" />
        </g>
      );
    case "quiz":
      return (
        <g>
          <circle cx="40" cy="40" r="22" fill="#ffd76a" />
          <text x="40" y="48" textAnchor="middle" fontSize="28" fontWeight="800" fill="#2a3d4a">
            ?
          </text>
        </g>
      );
    case "doctor":
      return (
        <g>
          <circle cx="40" cy="24" r="10" fill="#f7c9a3" />
          <path d="M24 56 v-8 a16 16 0 0 1 32 0 v8" fill="#1a6b7a" />
          <rect x="56" y="18" width="10" height="28" rx="3" fill="#e85d5d" />
          <rect x="50" y="24" width="22" height="10" rx="3" fill="#e85d5d" />
        </g>
      );
    case "search":
      return (
        <g>
          <circle cx="36" cy="34" r="12" fill="none" stroke="#1a6b7a" strokeWidth="4" />
          <line
            x1="45"
            y1="43"
            x2="58"
            y2="56"
            stroke="#1a6b7a"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      );
    case "refer":
      return (
        <g>
          <circle cx="28" cy="30" r="10" fill="#f7c9a3" />
          <circle cx="52" cy="30" r="10" fill="#f0c2b0" />
          <path d="M20 48 h20 l-2 16 H22 Z" fill="#1a6b7a" />
          <path d="M44 48 h20 l-2 16 H46 Z" fill="#2f8a7b" />
          <path d="M34 36 q6 -8 12 0" fill="none" stroke="#e85d5d" strokeWidth="2" />
        </g>
      );
    default:
      return (
        <g>
          <Face />
          <path d="M24 44 h32 l-4 22 H28 Z" fill="#1a6b7a" />
        </g>
      );
  }
}
