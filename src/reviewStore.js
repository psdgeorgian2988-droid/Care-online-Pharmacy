export const REVIEW_STORAGE_KEY = "mediHomeReviews";

export const REVIEW_SERVICES = [
  { value: "medicines", label: "Medicines" },
  { value: "labs", label: "Lab tests" },
  { value: "radiology", label: "Radiology" },
  { value: "homecare", label: "Home care" },
  { value: "stepdown", label: "Step-down care" },
  { value: "ambulance", label: "Ambulance" },
  { value: "other", label: "Other" },
];

const SEED_REVIEWS = [
  {
    id: "MH-RV-1001",
    name: "Priya Sharma",
    service: "medicines",
    rating: 5,
    comment:
      "MediHome tablets arrived the same evening. Clear pack, fair price versus the brand I was prescribed.",
    createdAt: "12 Aug 2026, 6:40 PM",
    createdAtMs: Date.parse("2026-08-12T18:40:00+05:30"),
  },
  {
    id: "MH-RV-1002",
    name: "Rakesh Gupta",
    service: "labs",
    rating: 5,
    comment:
      "Home collection for HbA1c was on time. Report was easy to save on the Reports page.",
    createdAt: "8 Aug 2026, 10:15 AM",
    createdAtMs: Date.parse("2026-08-08T10:15:00+05:30"),
  },
  {
    id: "MH-RV-1003",
    name: "Ananya Verma",
    service: "homecare",
    rating: 4,
    comment:
      "Physiotherapy visit at home was professional. Would like slightly earlier morning slots.",
    createdAt: "2 Aug 2026, 4:05 PM",
    createdAtMs: Date.parse("2026-08-02T16:05:00+05:30"),
  },
  {
    id: "MH-RV-1004",
    name: "Mohd. Imran",
    service: "ambulance",
    rating: 5,
    comment: "Non-emergency pickup to the hospital was calm and easy to track on the map.",
    createdAt: "28 Jul 2026, 9:22 AM",
    createdAtMs: Date.parse("2026-07-28T09:22:00+05:30"),
  },
];

function readList() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "null");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function loadReviews() {
  const stored = readList();
  if (stored) return stored;
  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(SEED_REVIEWS));
  } catch {
    return SEED_REVIEWS;
  }
  return SEED_REVIEWS;
}

export function addReview(review) {
  const next = [review, ...loadReviews()];
  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function serviceLabel(value) {
  return REVIEW_SERVICES.find((item) => item.value === value)?.label || "MediHome";
}

export function reviewStats(list = loadReviews()) {
  if (!list.length) return { count: 0, average: 0 };
  const sum = list.reduce((total, row) => total + Number(row.rating || 0), 0);
  return {
    count: list.length,
    average: Math.round((sum / list.length) * 10) / 10,
  };
}
