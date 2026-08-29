import { useEffect, useState } from "react";

const EVENT = "medihome-catalog";

export const EMPTY_CATALOG = {
  medicines: [],
  hiddenMedicineIds: [],
  services: [],
  hiddenServiceIds: [],
  coupons: [],
  app: { ticker: "", headline: "" },
  batches: [],
  purchases: [],
};

function asMedicine(row) {
  const brand = String(row?.brand || "MediHome").trim() || "MediHome";
  const isMediHome =
    row?.isMediHome ?? String(brand).toLowerCase() === "medihome";
  return {
    ...row,
    id: row?.id,
    name: String(row?.name || "").trim(),
    salt: String(row?.salt || "").trim(),
    strength: String(row?.strength || "").trim(),
    composition:
      String(row?.composition || "").trim() ||
      `${row?.salt || ""} ${row?.strength || ""}`.trim(),
    packSize: String(row?.packSize || "10 tablets").trim(),
    category: String(row?.category || "Other").trim(),
    mrp: Number(row?.mrp || 0),
    price: Number(row?.price || row?.mrp || 0),
    prescription: row?.prescription !== false,
    brand,
    isMediHome,
    aliases: Array.isArray(row?.aliases) ? row.aliases : [],
    image:
      row?.image ||
      (isMediHome ? "/meds/pack-medihome.svg" : "/meds/pack-navy.svg"),
    source: row?.source || "admin",
  };
}

export function mergeMedicineCatalogue(base, extra = [], hiddenIds = []) {
  const hidden = new Set((hiddenIds || []).map(String));
  const extras = (extra || []).map(asMedicine).filter((row) => row.name && !hidden.has(String(row.id)));
  const seen = new Set(extras.map((row) => String(row.id)));
  const kept = (base || []).filter((row) => {
    const id = String(row?.id);
    if (!id || hidden.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...extras, ...kept];
}

export function extraPlansFor(kind, group, services = []) {
  return (services || [])
    .filter((row) => String(row.kind) === String(kind))
    .filter((row) => !group || !row.group || row.group === "all" || row.group === group)
    .map((row) => ({
      value: row.id,
      label: row.name,
      price: Number(row.price || 0),
      mode: row.group || "",
      description: row.description || "",
      admin: true,
    }));
}

export function visibleBuiltinPlans(plans, kind, hiddenIds = []) {
  const hidden = new Set((hiddenIds || []).map(String));
  return (plans || []).filter((row) => !hidden.has(`${kind}:${row.value || row.id}`));
}

export function withExtraTests(partners, extras = [], hiddenIds = [], kind = "lab") {
  const hidden = new Set((hiddenIds || []).map(String));
  const extraTests = extras
    .filter((row) => row.kind === kind)
    .map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price || 0),
    }));
  return (partners || []).map((partner) => ({
    ...partner,
    tests: [
      ...(partner.tests || []).filter((test) => !hidden.has(`${kind}:${test.id}`)),
      ...extraTests.filter(
        (test) => !(partner.tests || []).some((row) => row.id === test.id)
      ),
    ],
  }));
}

export function cacheCatalog(data) {
  try {
    sessionStorage.setItem("mediHomeCatalog", JSON.stringify(data));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: data }));
}

export function readCachedCatalog() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem("mediHomeCatalog") || "null");
    if (parsed && typeof parsed === "object") {
      return { ...EMPTY_CATALOG, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_CATALOG };
}

export async function fetchPublicCatalog() {
  const res = await fetch("/api/catalog");
  const data = await res.json().catch(() => ({}));
  const next = { ...EMPTY_CATALOG, ...data };
  cacheCatalog(next);
  return next;
}

export function usePublicCatalog() {
  const [catalog, setCatalog] = useState(readCachedCatalog);
  useEffect(() => {
    fetchPublicCatalog().catch(() => {});
    const onUpdate = (event) => setCatalog({ ...EMPTY_CATALOG, ...event.detail });
    window.addEventListener(EVENT, onUpdate);
    return () => window.removeEventListener(EVENT, onUpdate);
  }, []);
  return catalog;
}
