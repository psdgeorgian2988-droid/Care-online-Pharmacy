export const SITE = {
  name: "MediHome",
  tagline: "Your complete health partner at your doorstep",
  description:
    "Order generic medicines, book lab tests and radiology, Home Care, step-down recovery, and ambulance in Delhi NCR. Cash on delivery and live PIN tracking.",
  url: "https://medihome.in",
  locale: "en_IN",
  phoneDisplay: "+91 96542 22988",
  phoneTel: "+919654222988",
  email: "care@medihome.in",
  whatsapp: "919654222988",
  hours: "8:00 AM – 10:00 PM IST",
  area: "Delhi NCR",
  image: "/og-image.svg",
};

export const SOCIAL = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@medihome.in",
    href: "https://www.instagram.com/medihome.in/",
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "MediHome",
    href: "https://www.facebook.com/medihome.in",
  },
  {
    id: "youtube",
    label: "YouTube",
    handle: "@MediHome",
    href: "https://www.youtube.com/@MediHome",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    handle: "MediHome",
    href: "https://www.linkedin.com/company/medihome",
  },
  {
    id: "x",
    label: "X",
    handle: "@medihome_in",
    href: "https://x.com/medihome_in",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    handle: SITE.phoneDisplay,
    href: `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
      "Hi MediHome, I would like to know more."
    )}`,
  },
];

const PAGE_META = {
  home: {
    title: "MediHome | Medicines, Lab Tests And Home Care In Delhi NCR",
    description: SITE.description,
  },
  "medicine-search": {
    title: "Order Medicines Online | MediHome Delhi NCR",
    description:
      "Search generic and MediHome medicines with cash on delivery across Delhi NCR.",
  },
  labs: {
    title: "Lab Tests And Radiology | MediHome",
    description:
      "Book home sample collection and partner-centre scans with MediHome diagnostics.",
  },
  homecare: {
    title: "Home Care: Nurse, Caregiver, Physiotherapy | MediHome",
    description:
      "Book nurse visits, caregiver duty, and physiotherapy at home in Delhi NCR.",
  },
  stepdown: {
    title: "Step-Down Care Centres | MediHome",
    description:
      "Find post-ICU and recovery centres near you and book a stay with MediHome.",
  },
  ambulance: {
    title: "Request An Ambulance | MediHome",
    description:
      "Emergency or planned ambulance pickup in Delhi NCR, with live PIN tracking.",
  },
  reports: {
    title: "Save Health Reports | MediHome",
    description: "Keep lab PDFs on this device for clinic visits with MediHome Reports.",
  },
  profile: {
    title: "Your Profile | MediHome",
    description: "Save your name, mobile, address, and PIN for faster MediHome bookings.",
  },
  myorders: {
    title: "My Orders | MediHome",
    description: "Track medicines, diagnostics, Home Care, and ambulance bookings.",
  },
  track: {
    title: "Track Live | MediHome",
    description: "Follow your MediHome order or visit on the live PIN map.",
  },
  education: {
    title: "Health Education | MediHome",
    description:
      "Practical guides, live webinars, and short quizzes for chronic care at home from MediHome.",
  },
  about: {
    title: "About MediHome | Chronic Care At Your Doorstep",
    description:
      "MediHome is a neighbourhood health partner for medicines, diagnostics, and home services in Delhi NCR.",
  },
  social: {
    title: "Social Media | MediHome",
    description:
      "Follow MediHome on Instagram, Facebook, YouTube, LinkedIn, and X. Copy ready captions for social media marketing.",
  },
  feedback: {
    title: "Share Feedback | MediHome",
    description: "Rate medicines, diagnostics, Home Care, or ambulance with MediHome.",
  },
  reviews: {
    title: "Patient Reviews | MediHome",
    description: "Read what MediHome customers say about medicines, labs, and home visits.",
  },
  admin: {
    title: "Staff Login | MediHome",
    description: "MediHome operations desk for incoming orders.",
  },
  partner: {
    title: "Partner Desk | MediHome",
    description: "Assigned jobs for MediHome delivery, lab, Home Care, and ambulance partners.",
  },
};

export function pageMeta(route) {
  const key = String(route || "#home").replace(/^#/, "") || "home";
  return PAGE_META[key] || PAGE_META.home;
}

export function pageUrl(route) {
  const hash = route && route !== "#home" ? route : "";
  return `${SITE.url}/${hash}`;
}

export function socialJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: SITE.name,
    url: SITE.url,
    image: `${SITE.url}${SITE.image}`,
    description: SITE.description,
    telephone: SITE.phoneTel,
    email: SITE.email,
    areaServed: SITE.area,
    openingHours: "Mo-Su 08:00-22:00",
    sameAs: SOCIAL.filter((item) => item.id !== "whatsapp").map((item) => item.href),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.phoneTel,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  };
}
