import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners.js";
import { labBookingHash } from "./hashRoute.js";

const LAB_LOGOS = {
  metropolis: "/logos/labs/metropolis.png",
  "max-healthcare": "/logos/labs/max-healthcare.png",
  "lal-pathlabs": "/logos/labs/lal-pathlabs.png",
  agilus: "/logos/labs/agilus.png",
  pathcare: "/logos/labs/pathcare.jpg",
};

const LAB_CARTOONS = ["blood", "diabetes", "heart", "thyroid", "liver", "kidney", "report"];
const RAD_CARTOONS = ["mri", "ct", "ultrasound", "xray", "mammo"];

/** Home screen: feature headings with included sub-services. */
export const HOME_SERVICE_TREE = [
  {
    key: "medicine",
    label: "Medicines",
    items: [
      {
        id: "med-search",
        label: "Search",
        href: "#medicine-search?service=Search",
        cartoon: "search",
        category: "Search",
      },
      {
        id: "med-diabetes",
        label: "Diabetes Care",
        href: "#medicine-search?service=Diabetes",
        cartoon: "diabetes",
        category: "Diabetes",
      },
      {
        id: "med-heart",
        label: "Heart Care",
        href: "#medicine-search?service=Cardiology",
        cartoon: "heart",
        category: "Cardiology",
      },
      {
        id: "med-pain",
        label: "Pain Relief",
        href: "#medicine-search?service=Pain%20Relief",
        cartoon: "pain",
        category: "Pain Relief",
      },
      {
        id: "med-supplements",
        label: "Supplements",
        href: "#medicine-search?service=Supplements",
        cartoon: "vitamins",
        category: "Supplements",
      },
      {
        id: "med-infection",
        label: "Infection Care",
        href: "#medicine-search?service=Infection",
        cartoon: "infection",
        category: "Infection",
      },
      {
        id: "med-women",
        label: "Women's Health",
        href: "#medicine-search?service=Women%27s%20Health",
        cartoon: "women",
        category: "Women's Health",
      },
    ],
  },
  {
    key: "lab",
    label: "Lab Tests",
    items: DIAGNOSTIC_LABS.map((lab, index) => ({
      id: `lab-${lab.id}`,
      label: lab.name,
      href: labBookingHash(lab.id, "lab"),
      cartoon: LAB_CARTOONS[index % LAB_CARTOONS.length],
      logo: LAB_LOGOS[lab.id] || "",
    })),
  },
  {
    key: "radiology",
    label: "Radiology",
    items: IMAGING_CENTRES.map((centre, index) => ({
      id: `rad-${centre.id}`,
      label: centre.name,
      href: labBookingHash(centre.id, "radiology"),
      cartoon: RAD_CARTOONS[index % RAD_CARTOONS.length],
    })),
  },
  {
    key: "homecare",
    label: "Home Care",
    items: [
      { id: "hc-nurse", label: "Nurse Visit", href: "#homecare?service=nurse", cartoon: "nurse" },
      {
        id: "hc-caregiver",
        label: "Caregiver",
        href: "#homecare?service=caregiver",
        cartoon: "caregiver",
      },
      {
        id: "hc-physio",
        label: "Physiotherapy",
        href: "#homecare?service=physiotherapy",
        cartoon: "physio",
      },
    ],
  },
  {
    key: "vaccination",
    label: "Vaccination",
    items: [
      {
        id: "vax-adult",
        label: "Adult Vaccination",
        href: "#homecare?service=nurse&plan=vaccination",
        cartoon: "vax-adult",
      },
      {
        id: "vax-child",
        label: "Children Vaccination",
        href: "#homecare?service=nurse&plan=vaccination-child",
        cartoon: "vax-child",
      },
    ],
  },
  {
    key: "doctor",
    label: "Doctor Appointment",
    items: [
      { id: "doc-gp", label: "General Physician", href: "#doctor?service=gp", cartoon: "doctor" },
      { id: "doc-child", label: "Pediatrician", href: "#doctor?service=pediatrician", cartoon: "child" },
      { id: "doc-gyn", label: "Gynecologist", href: "#doctor?service=gynecologist", cartoon: "women" },
      { id: "doc-heart", label: "Cardiologist", href: "#doctor?service=cardiologist", cartoon: "heart" },
      { id: "doc-ortho", label: "Orthopedic", href: "#doctor?service=orthopedic", cartoon: "physio" },
      { id: "doc-derm", label: "Dermatologist", href: "#doctor?service=dermatologist", cartoon: "wound" },
      { id: "doc-ent", label: "ENT", href: "#doctor?service=ent", cartoon: "followup" },
      { id: "doc-nephro", label: "Nephrologist", href: "#doctor?service=nephrologist", cartoon: "kidney" },
      { id: "doc-other", label: "Other", href: "#doctor?service=other", cartoon: "followup" },
    ],
  },
  {
    key: "psychologist",
    label: "Psychologist Consultation",
    items: [
      { id: "psy-video", label: "Video Consult", href: "#psychologist?service=video", cartoon: "video" },
      { id: "psy-follow", label: "Follow-up Session", href: "#psychologist?service=followup", cartoon: "followup" },
      { id: "psy-child", label: "Child / Teen", href: "#psychologist?service=child", cartoon: "child" },
      { id: "psy-couple", label: "Couple / Family", href: "#psychologist?service=couple", cartoon: "couple" },
      { id: "psy-home", label: "Home Visit", href: "#psychologist?service=home-visit", cartoon: "home-visit" },
    ],
  },
  {
    key: "stepdown",
    label: "Step-Down Care",
    items: [
      { id: "sd-icu", label: "Post-ICU Recovery", href: "#stepdown?service=post-icu", cartoon: "icu" },
      { id: "sd-surgery", label: "Post-Surgery Care", href: "#stepdown?service=post-surgery", cartoon: "surgery" },
      { id: "sd-rehab", label: "Rehab & Physio", href: "#stepdown?service=rehab", cartoon: "physio" },
      { id: "sd-wound", label: "Wound / Drain Care", href: "#stepdown?service=wound", cartoon: "wound" },
      { id: "sd-assisted", label: "Assisted Recovery", href: "#stepdown?service=assisted", cartoon: "caregiver" },
    ],
  },
  {
    key: "ambulance",
    label: "Ambulance",
    items: [
      { id: "amb-em", label: "Emergency Ambulance", href: "#ambulance?service=emergency", cartoon: "ambulance" },
      {
        id: "amb-non",
        label: "Non-Emergency Transfer",
        href: "#ambulance?service=non-emergency",
        cartoon: "transfer",
      },
    ],
  },
  {
    key: "reports",
    label: "Medical Record",
    items: [
      { id: "rep-lab", label: "Lab reports", href: "#reports?service=lab", cartoon: "report", icon: "lab" },
      { id: "rep-img", label: "Imaging reports", href: "#reports?service=radiology", cartoon: "xray", icon: "radiology" },
      { id: "rep-rx", label: "Prescription", href: "#reports?service=prescription", cartoon: "record", icon: "record" },
      { id: "rep-vax", label: "Vaccination", href: "#reports?service=vaccination", cartoon: "record", icon: "vaccination" },
    ],
  },
  {
    key: "education",
    label: "Health Education",
    items: [
      { id: "edu-guides", label: "Guides", href: "#education?service=guides", cartoon: "guide" },
      { id: "edu-webinars", label: "Webinars", href: "#education?service=webinars", cartoon: "webinar" },
      { id: "edu-quiz", label: "Health Quiz", href: "#education?service=quiz", cartoon: "quiz" },
      { id: "edu-refer", label: "Refer & Earn", href: "#education?service=refer", cartoon: "refer" },
    ],
  },
];
