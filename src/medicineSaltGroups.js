function foldSalt(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tidySaltName(part) {
  return String(part || "")
    .replace(/\s+XR$/i, "")
    .replace(/\s+SR$/i, "")
    .replace(/\s+ER$/i, "")
    .trim();
}

export function saltParts(medicine) {
  const salt = String(medicine?.salt || "").trim();
  if (!salt) {
    const fallback = String(medicine?.name || "")
      .replace(/^MediHome\s+/i, "")
      .split(/\s+\d/)[0]
      .trim();
    return fallback ? [fallback] : [];
  }
  return salt.split(/\s*\+\s*/).map(tidySaltName).filter(Boolean);
}

const CATEGORY_ALIASES = {
  gastro: "Gastric",
  gastric: "Gastric",
};

export function normalizeMedicineCategory(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return CATEGORY_ALIASES[raw.toLowerCase()] || raw;
}

export function medicineInCategory(medicine, category) {
  if (!category || category === "All" || category === "Search") return true;
  return normalizeMedicineCategory(medicine?.category) === normalizeMedicineCategory(category);
}

export function groupMedicineFamilies(list = []) {
  const map = new Map();
  list.forEach((medicine) => {
    saltParts(medicine).forEach((name) => {
      const key = foldSalt(name);
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        if (!existing.items.some((item) => item.id === medicine.id)) {
          existing.items.push(medicine);
        }
      } else {
        map.set(key, { key, name, items: [medicine] });
      }
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
