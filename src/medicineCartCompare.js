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

export function packsPerMonthFor(medicine) {
  const count = parseInt(String(medicine?.packSize || "").match(/\d+/)?.[0] || "10", 10);
  if (!count || count <= 0) return 3;
  return Math.max(1, Math.min(12, Math.round(30 / count) || 3));
}

export function monthlySavingForItem(item) {
  const compare = item?.prescribedBrand;
  if (!compare) return 0;
  const savePack = Number(
    compare.save ||
      Math.max(0, Number(compare.mrp || 0) - Number(item?.price || 0))
  );
  return savePack * packsPerMonthFor(item);
}

export function monthlySavingForCart(cart = []) {
  return cart.reduce((sum, item) => sum + monthlySavingForItem(item), 0);
}

export function resolveCartAdd(medicine, list = [], preferredBrand = null, options = {}) {
  if (!medicine) return null;
  if (!options.searchingBrand) {
    return { selling: medicine, prescribed: null, compare: null };
  }
  const prescribed =
    preferredBrand && !preferredBrand.isMediHome
      ? preferredBrand
      : medicine.isMediHome
        ? null
        : medicine;
  const selling = medicine.isMediHome
    ? medicine
    : findMatchingMediHome(list, medicine) || medicine;
  return {
    selling,
    prescribed,
    compare: prescribed ? compareWithPrescribedBrand(selling, prescribed) : null,
  };
}
