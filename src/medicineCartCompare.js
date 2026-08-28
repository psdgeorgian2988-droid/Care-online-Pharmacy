function digits(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function medicineCompositionKey(medicine = {}) {
  return digits(`${medicine.salt || ""} ${medicine.strength || ""}`);
}

export function findMatchingMediHome(list = [], brandMedicine) {
  if (!brandMedicine) return null;
  const key = medicineCompositionKey(brandMedicine);
  if (!key) return null;
  return (
    list.find(
      (medicine) => medicine.isMediHome && medicineCompositionKey(medicine) === key
    ) || null
  );
}

export function findPrescribedBrand(list = [], medicine, preferredBrand) {
  if (!medicine) return null;
  const key = medicineCompositionKey(medicine);
  if (!key) return null;
  if (
    preferredBrand &&
    !preferredBrand.isMediHome &&
    medicineCompositionKey(preferredBrand) === key
  ) {
    return preferredBrand;
  }
  if (!medicine.isMediHome) return medicine;
  const brands = list.filter(
    (row) => !row.isMediHome && medicineCompositionKey(row) === key
  );
  if (!brands.length) return null;
  return [...brands].sort(
    (a, b) => Number(b.mrp || 0) - Number(a.mrp || 0)
  )[0];
}

export function compareWithPrescribedBrand(sellingMed, prescribedBrand) {
  if (!sellingMed || !prescribedBrand) return null;
  const mrp = Number(prescribedBrand.mrp || prescribedBrand.price || 0);
  const price = Number(sellingMed.price || 0);
  const save = Math.max(0, mrp - price);
  const percent = mrp > 0 ? Math.round((save / mrp) * 100) : 0;
  return {
    brand: prescribedBrand.brand || prescribedBrand.name || "",
    name: prescribedBrand.name || "",
    composition: prescribedBrand.composition || prescribedBrand.salt || "",
    strength: prescribedBrand.strength || sellingMed.strength || "",
    mrp,
    price,
    save,
    percent,
  };
}

export function resolveCartAdd(medicine, list = [], preferredBrand = null) {
  if (!medicine) return null;
  const prescribed = findPrescribedBrand(list, medicine, preferredBrand);
  const selling = medicine.isMediHome
    ? medicine
    : findMatchingMediHome(list, medicine) || medicine;
  const compare = compareWithPrescribedBrand(selling, prescribed);
  return { selling, prescribed, compare };
}
