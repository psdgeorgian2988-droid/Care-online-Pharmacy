export const CARE_PHONE_DISPLAY = "+91 72920 94000";
export const CARE_PHONE_TEL = "+917292094000";
export const CARE_EMAIL = "care@medihome.in";
export const CARE_WHATSAPP = "917292094000";
export const CARE_HOURS = "8:00 AM – 10:00 PM IST, all days";
export const MEDIBOT_NAME = "MediBot";
/** Dispatched to open MediBot from floating controls (and other entry points). */
export const OPEN_MEDIBOT_EVENT = "mediHomeOpenMediBot";

export function openMediBot() {
  try {
    globalThis.dispatchEvent?.(new Event(OPEN_MEDIBOT_EVENT));
  } catch {
    /* ignore */
  }
}

export const CARE_WHATSAPP_URL = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I need help from customer care."
)}`;

export const QUICK_PROMPTS = [
  { label: "How to use MediHome", text: "How do I use MediHome?" },
  { label: "Track order", text: "I want to track my order" },
  { label: "Medicines", text: "I need medicines delivered" },
  { label: "Lab test", text: "I want to book a lab test" },
  { label: "Home Care", text: "How do I book Home Care?" },
  { label: "Talk to a person", text: "Please connect me to a care executive" },
];

const PHONE_LINKS = [
  { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
  { href: CARE_WHATSAPP_URL, label: "WhatsApp care" },
];

export function newSessionId() {
  return `care-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMessageId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function clipText(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function wantsHuman(text) {
  return /\b(human|person|executive|agent|someone|staff|call me|talk to|customer care|helpline)\b/i.test(
    text
  );
}

function escalate(reason) {
  return {
    text: `${reason} Please call MediHome customer care at ${CARE_PHONE_DISPLAY} (${CARE_HOURS}), or continue on WhatsApp.`,
    needsStaff: true,
    links: [...PHONE_LINKS, { href: "#contact", label: "Contact page" }],
  };
}

export function replyTo(rawText) {
  const text = clipText(rawText, 500);
  const q = text.toLowerCase();

  if (wantsHuman(q)) {
    return escalate("I will connect you with a MediHome care executive.");
  }

  if (
    /\b(how (do|to|can) i use|how does .+ work|get started|using medihome|app guide|help me use)\b/.test(
      q
    ) ||
    /\b(guest|continue as guest|register|sign up|login|log in|sign in)\b/.test(q)
  ) {
    return {
      text: "To use MediHome: open Home, choose a service (Medicines, Lab Tests, Home Care, and more), complete the booking form, then track it in My Orders. Guests can continue without an account; Login/Register saves your details for faster checkout.",
      needsStaff: false,
      links: [
        { href: "#home", label: "Open Home" },
        { href: "#login", label: "Login" },
        { href: "#register", label: "Register" },
      ],
    };
  }

  if (/\b(account|profile|password|forgot|otp|reset)\b/.test(q)) {
    return {
      text: "Manage your name, mobile, and addresses from Profile after login. Use Forgot password on the Login page if you cannot sign in. If OTP or account access still fails, call customer care.",
      needsStaff: false,
      links: [
        { href: "#profile", label: "Profile" },
        { href: "#forgot", label: "Forgot password" },
        { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      ],
    };
  }

  if (/\b(payment|pay|cod|cash on delivery|refund|bill|invoice)\b/.test(q)) {
    return {
      text: "Many services support cash on delivery or in-app payment where shown on the checkout screen. Open the order in My Orders for bill details. For refunds or failed payments, MediBot cannot resolve payment disputes—please call customer care.",
      needsStaff: false,
      links: [
        { href: "#myorders", label: "My Orders" },
        { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      ],
    };
  }

  if (/\b(qr|scan delivery|pickup|received|barcode)\b/.test(q)) {
    return {
      text: "Scan Delivery is used when receiving a medicine order. Open Scan Delivery from the menu while the feature is on. If it shows Coming Soon, staff have switched it off temporarily.",
      needsStaff: false,
      links: [
        { href: "#scan?step=deliver", label: "Scan Delivery" },
        { href: "#myorders", label: "My Orders" },
      ],
    };
  }

  if (/\b(track|where is|status|delivery boy|agent assigned)\b/.test(q)) {
    return {
      text: "Open My Orders, select your booking, then use Live track for status updates. Share your order id with customer care if tracking looks stuck.",
      needsStaff: false,
      links: [{ href: "#myorders", label: "My Orders" }],
    };
  }

  if (/\b(medicines?|tablet|syrup|strip|dolo|crocin|order medicine|pharmacy)\b/.test(q)) {
    return {
      text: "Search medicines by brand, salt, or upload a strip photo. Add to cart, confirm your PIN address, and place the order. Delivery is available across Delhi NCR with cash on delivery where enabled.",
      needsStaff: false,
      links: [{ href: "#medicine-search", label: "Search medicines" }],
    };
  }

  if (/\b(webinar|education|quiz|health education|points)\b/.test(q)) {
    return {
      text: "Health Education has guides, quizzes, and live webinars. Join a webinar at the scheduled start (up to 5 minutes late) and stay until the end to earn MediHome points. Registration alone does not add points.",
      needsStaff: false,
      links: [{ href: "#education?service=webinars", label: "Webinars" }],
    };
  }

  if (/\b(lab|blood|sample|test|thyroid|cbc|hba1c|report)\b/.test(q)) {
    return {
      text: "Book lab tests with home sample collection: choose the test, enter your PIN, pick a slot, and confirm. Reports appear under Reports / My Orders when ready.",
      needsStaff: false,
      links: [
        { href: "#labs", label: "Book a lab test" },
        { href: "#reports", label: "Reports" },
      ],
    };
  }

  if (/\b(scan|x-?ray|mri|ct|ultrasound|radiology|imaging)\b/.test(q)) {
    return {
      text: "Radiology is booked at partner imaging centres. Open Lab Tests, switch to Radiology, pick the scan, and choose a centre near your PIN.",
      needsStaff: false,
      links: [{ href: "#labs", label: "Book a scan" }],
    };
  }

  if (/\b(psychologist|psychiatrist|counsellor|counselor|mental health|anxiety|depression)\b/.test(q)) {
    return {
      text: "Book a confidential psychologist session on video or as a home visit from the Psychologist page. Choose a plan and slot, then confirm.",
      needsStaff: false,
      links: [{ href: "#psychologist", label: "Book a psychologist" }],
    };
  }

  if (/\b(vaccin|immunis|immuniz|bcg|polio|pentavalent)\b/.test(q)) {
    return {
      text: "Vaccination Record follows the Government of India schedule. Book an adult or children vaccination nurse visit from Home Care.",
      needsStaff: false,
      links: [
        { href: "#vaccination", label: "Vaccination Record" },
        { href: "#homecare?service=nurse&plan=vaccination", label: "Book Nurse Visit" },
      ],
    };
  }

  if (/\b(nurse|physiotherapy|physio|caregiver|home care|homecare)\b/.test(q)) {
    return {
      text: "Home Care covers nurse visits, caregiver support, and physiotherapy at your PIN. Open Home Care, pick the service type and plan, then confirm the slot.",
      needsStaff: false,
      links: [{ href: "#homecare", label: "Book Home Care" }],
    };
  }

  if (/\b(step-?down|recovery|icu step|admission)\b/.test(q)) {
    return {
      text: "Step-down care supports recovery after hospital discharge. Search a centre by PIN on the Step-Down page and submit a request.",
      needsStaff: false,
      links: [{ href: "#stepdown", label: "Find a centre" }],
    };
  }

  if (/\b(ambulance|emergency|stretcher)\b/.test(q)) {
    return {
      text: "Request an ambulance with your pickup PIN on the Ambulance page. For a life-threatening emergency, also call 112 immediately.",
      needsStaff: false,
      links: [
        { href: "#ambulance", label: "Request ambulance" },
        { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      ],
    };
  }

  if (/\b(hour|timing|open|close|when available)\b/.test(q)) {
    return {
      text: `MediBot is available anytime. Human customer care is available ${CARE_HOURS}. Bookings can be placed any time and are confirmed during care hours.`,
      needsStaff: false,
      links: [{ href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` }],
    };
  }

  if (/\b(cancel|reschedule|change slot|wrong address|complaint|issue|problem|not working|bug|error)\b/.test(q)) {
    return escalate(
      "That needs a care executive to check your booking or account details."
    );
  }

  if (/\b(hello|hi|hey|namaste|help|medibot)\b/.test(q) || q.length < 12) {
    return {
      text: `Namaste. I am ${MEDIBOT_NAME}, your MediHome assistant. Ask me how to book medicines, lab tests, Home Care, vaccination, radiology, psychologist visits, ambulance, or how to track an order. If I cannot solve it, I will share customer care ${CARE_PHONE_DISPLAY}.`,
      needsStaff: false,
      links: [],
    };
  }

  return escalate("I could not fully solve that from here.");
}

export function welcomeMessage() {
  return {
    id: "welcome",
    from: "bot",
    text: `Namaste. I am ${MEDIBOT_NAME}. Ask anything about using MediHome—bookings, tracking, payments, or account help. If I cannot resolve your query, call customer care ${CARE_PHONE_DISPLAY} (${CARE_HOURS}).`,
    at: Date.now(),
    links: [
      { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      { href: CARE_WHATSAPP_URL, label: "WhatsApp" },
    ],
  };
}
