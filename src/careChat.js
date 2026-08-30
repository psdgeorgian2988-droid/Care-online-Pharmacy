export const CARE_PHONE_DISPLAY = "+91 72920 94000";
export const CARE_PHONE_TEL = "+917292094000";
export const CARE_EMAIL = "care@medihome.in";
export const CARE_WHATSAPP = "917292094000";
export const CARE_HOURS = "8:00 AM – 10:00 PM IST, all days";

export const CARE_WHATSAPP_URL = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I need help from customer care."
)}`;

export const QUICK_PROMPTS = [
  { label: "Track order", text: "I want to track my order" },
  { label: "Medicines", text: "I need medicines delivered" },
  { label: "Lab test", text: "I want to book a lab test" },
  { label: "Ambulance", text: "I need an ambulance" },
  { label: "Psychologist", text: "I want a psychologist consultation" },
  { label: "Talk to a person", text: "Please connect me to a care executive" },
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
  return /\b(human|person|executive|agent|someone|staff|call me|talk to)\b/i.test(text);
}

export function replyTo(rawText) {
  const text = clipText(rawText, 500);
  const q = text.toLowerCase();

  if (wantsHuman(q)) {
    return {
      text: `I will leave this chat for a MediHome executive. You can also call ${CARE_PHONE_DISPLAY} or continue on WhatsApp. Hours: ${CARE_HOURS}.`,
      needsStaff: true,
      links: [
        { href: CARE_WHATSAPP_URL, label: "WhatsApp care" },
        { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      ],
    };
  }

  if (/\b(qr|scan|pickup|received|barcode)\b/.test(q)) {
    return {
      text: "Scan Delivery stays on the menu. If staff switch it off, it opens Coming Soon. When it is on, use it while receiving a medicine order.",
      needsStaff: false,
      links: [
        { href: "#scan?step=deliver", label: "Scan Delivery" },
        { href: "#myorders", label: "My Orders" },
      ],
    };
  }

  if (/\b(track|where is|status|otp|delivery boy|agent)\b/.test(q)) {
    return {
      text: "Open My Orders, pick the booking, then Live track. Share the order id here if you want a care executive to check it.",
      needsStaff: false,
      links: [{ href: "#myorders", label: "My Orders" }],
    };
  }

  if (/\b(medicines?|tablet|syrup|strip|dolo|crocin|order medicine)\b/.test(q)) {
    return {
      text: "Search by brand, salt, or a strip photo. We deliver across Delhi NCR with cash on delivery.",
      needsStaff: false,
      links: [{ href: "#medicine-search", label: "Search medicines" }],
    };
  }

  if (/\b(webinar|education|quiz|health education)\b/.test(q)) {
    return {
      text: "Live webinar seats open only after MediHome schedules a session. The app shows a notice when a date is set. Open Health Education to book.",
      needsStaff: false,
      links: [{ href: "#education?service=webinars", label: "Webinars" }],
    };
  }

  if (/\b(lab|blood|sample|test|thyroid|cbc)\b/.test(q)) {
    return {
      text: "You can book home sample collection for lab tests. Choose the test and a PIN, then we assign a collection executive.",
      needsStaff: false,
      links: [{ href: "#labs", label: "Book a lab test" }],
    };
  }

  if (/\b(scan|x-?ray|mri|ct|ultrasound|radiology)\b/.test(q)) {
    return {
      text: "Radiology is booked at partner centres. Open Lab Tests and switch to Radiology to pick a scan.",
      needsStaff: false,
      links: [{ href: "#labs", label: "Book a scan" }],
    };
  }

  if (/\b(psychologist|psychiatrist|counsellor|counselor|mental health|anxiety|depression)\b/.test(q)) {
    return {
      text: "You can book a confidential psychologist session on video or as a home visit. Choose a slot on the Psychologist page.",
      needsStaff: false,
      links: [{ href: "#psychologist", label: "Book a psychologist" }],
    };
  }

  if (/\b(vaccin|immunis|immuniz|bcg|polio|pentavalent)\b/.test(q)) {
    return {
      text: "Vaccination records and due dates follow the Government of India schedule. Book a nurse vaccination visit from Home Care.",
      needsStaff: false,
      links: [
        { href: "#vaccination", label: "Vaccination Record" },
        { href: "#homecare?service=nurse&plan=vaccination", label: "Book Nurse Visit" },
      ],
    };
  }

  if (/\b(nurse|physiotherapy|physio|caregiver|home care|homecare)\b/.test(q)) {
    return {
      text: "Home Care covers nurse, caregiver, and physiotherapy visits at your PIN. Adult Vaccination and Children Vaccination are in the nurse dropdown.",
      needsStaff: false,
      links: [{ href: "#homecare", label: "Book Home Care" }],
    };
  }

  if (/\b(step-?down|recovery|icu step|admission)\b/.test(q)) {
    return {
      text: "Step-down care is for recovery after hospital discharge. Search a centre by PIN on that page.",
      needsStaff: false,
      links: [{ href: "#stepdown", label: "Find a centre" }],
    };
  }

  if (/\b(ambulance|emergency|stretcher)\b/.test(q)) {
    return {
      text: "For ambulance, use the request form with pickup PIN. For a life-threatening emergency, also call 112.",
      needsStaff: false,
      links: [
        { href: "#ambulance", label: "Request ambulance" },
        { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      ],
    };
  }

  if (/\b(hour|timing|open|close|when)\b/.test(q)) {
    return {
      text: `Customer care is available ${CARE_HOURS}. Bookings can be placed any time and are confirmed during those hours.`,
      needsStaff: false,
      links: [],
    };
  }

  if (/\b(hello|hi|hey|namaste|help)\b/.test(q) || q.length < 12) {
    return {
      text: "Namaste. I am MediHome care. I can help with medicines, lab tests, Home Care, vaccination, psychologist consultation, ambulance, or tracking an order.",
      needsStaff: false,
      links: [],
    };
  }

  return {
    text: `I have noted that. A care executive can take it from here, or use WhatsApp / ${CARE_PHONE_DISPLAY}.`,
    needsStaff: true,
    links: [
      { href: CARE_WHATSAPP_URL, label: "WhatsApp care" },
      { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      { href: "#contact", label: "Contact page" },
    ],
  };
}

export function welcomeMessage() {
  return {
    id: "welcome",
    from: "bot",
    text: `Namaste. MediHome customer care here. Ask about an order, a booking, or tap a topic below. You can also call the same number as Contact Us: ${CARE_PHONE_DISPLAY}.`,
    at: Date.now(),
    links: [
      { href: `tel:${CARE_PHONE_TEL}`, label: `Call ${CARE_PHONE_DISPLAY}` },
      { href: CARE_WHATSAPP_URL, label: "WhatsApp" },
    ],
  };
}
