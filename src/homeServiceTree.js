import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners";

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
        href: "#medicine-search",
        cartoon: "search",
        category: "Search",
      },
      {
        id: "med-diabetes",
        label: "Diabetes Care",
        href: "#medicine-search",
        cartoon: "diabetes",
        category: "Diabetes",
      },
      {
        id: "med-heart",
        label: "Heart Care",
        href: "#medicine-search",
        cartoon: "heart",
        category: "Cardiology",
      },
      {
        id: "med-pain",
        label: "Pain Relief",
        href: "#medicine-search",
        cartoon: "pain",
        category: "Pain Relief",
      },
      {
        id: "med-supplements",
        label: "Supplements",
        href: "#medicine-search",
        cartoon: "vitamins",
        category: "Supplements",
      },
      {
        id: "med-infection",
        label: "Infection Care",
        href: "#medicine-search",
        cartoon: "infection",
        category: "Infection",
      },
      {
        id: "med-women",
        label: "Women's Health",
        href: "#medicine-search",
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
      href: `#labs?service=lab&lab=${encodeURIComponent(lab.id)}`,
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
      href: `#labs?service=radiology&lab=${encodeURIComponent(centre.id)}`,
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
      { id: "vax-record", label: "Vaccination Record", href: "#vaccination", cartoon: "record" },
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
      { id: "psy-video", label: "Video Consult", href: "#psychologist", cartoon: "video" },
      { id: "psy-follow", label: "Follow-up Session", href: "#psychologist", cartoon: "followup" },
      { id: "psy-child", label: "Child / Teen", href: "#psychologist", cartoon: "child" },
      { id: "psy-couple", label: "Couple / Family", href: "#psychologist", cartoon: "couple" },
      { id: "psy-home", label: "Home Visit", href: "#psychologist", cartoon: "home-visit" },
    ],
  },
  {
    key: "stepdown",
    label: "Step-Down Care",
    items: [
      { id: "sd-icu", label: "Post-ICU Recovery", href: "#stepdown", cartoon: "icu" },
      { id: "sd-surgery", label: "Post-Surgery Care", href: "#stepdown", cartoon: "surgery" },
      { id: "sd-rehab", label: "Rehab & Physio", href: "#stepdown", cartoon: "physio" },
      { id: "sd-wound", label: "Wound / Drain Care", href: "#stepdown", cartoon: "wound" },
      { id: "sd-assisted", label: "Assisted Recovery", href: "#stepdown", cartoon: "caregiver" },
    ],
  },
  {
    key: "ambulance",
    label: "Ambulance",
    items: [
      { id: "amb-em", label: "Emergency Ambulance", href: "#ambulance", cartoon: "ambulance" },
      {
        id: "amb-non",
        label: "Non-Emergency Transfer",
        href: "#ambulance",
        cartoon: "transfer",
      },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    items: [
      { id: "rep-lab", label: "Lab Reports", href: "#reports", cartoon: "report" },
      { id: "rep-img", label: "Imaging Reports", href: "#reports", cartoon: "xray" },
    ],
  },
  {
    key: "education",
    label: "Health Education",
    items: [
      { id: "edu-guides", label: "Guides", href: "#education", cartoon: "guide" },
      { id: "edu-webinars", label: "Webinars", href: "#education?service=webinars", cartoon: "webinar" },
      { id: "edu-quiz", label: "Health Quiz", href: "#education", cartoon: "quiz" },
      { id: "edu-refer", label: "Refer & Earn", href: "#education", cartoon: "refer" },
    ],
  },
];
