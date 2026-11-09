export const DOSE_REMINDER_KEY = "mediHomeDoseReminders";
export const DOSE_REMINDER_EVENT = "mediHomeDoseReminders";

export const DOSE_SLOTS = [
  { id: "ante-jentaculum", plain: "Before breakfast", time: "07:00" },
  { id: "post-jentaculum", plain: "After breakfast", time: "08:30" },
  { id: "ante-prandium", plain: "Before lunch", time: "12:30" },
  { id: "post-prandium", plain: "After lunch", time: "13:30" },
  { id: "ante-cenam", plain: "Before dinner", time: "19:00" },
  { id: "post-cenam", plain: "After dinner", time: "20:30" },
  { id: "hora-somni", plain: "Before sleep", time: "22:00" },
  { id: "sos", plain: "SOS", asNeeded: true, time: "" },
];

function slotDefaults() {
  return Object.fromEntries(
    DOSE_SLOTS.map((slot) => [
      slot.id,
      { time: slot.time, alarmOn: false, medicines: [] },
    ])
  );
}

export function emptyDoseSchedule() {
  return { slots: slotDefaults(), fired: {}, taken: {} };
}

export function medicineDoseKey(med, index = 0) {
  const id = String(med?.id || "").trim();
  if (id) return id;
  const name = String(med?.name || "medicine").trim().toLowerCase();
  return `med-${index}-${name}`;
}

const PACK_ART = {
  Diabetes: "/meds/pack-green.svg",
  Hypertension: "/meds/pack-navy.svg",
  Cholesterol: "/meds/pack-navy.svg",
  Cardiology: "/meds/pack-rose.svg",
  Thyroid: "/meds/pack-blue.svg",
  "Kidney Care": "/meds/pack-slate.svg",
  Respiratory: "/meds/pack-sky.svg",
  "Bone & Joint": "/meds/pack-amber.svg",
  Supplements: "/meds/pack-gold.svg",
  "Pain Relief": "/meds/pack-amber.svg",
  Gastric: "/meds/pack-violet.svg",
  Infection: "/meds/pack-gold.svg",
  Allergy: "/meds/pack-rose.svg",
  Neurology: "/meds/pack-violet.svg",
  Urology: "/meds/pack-slate.svg",
  "Women's Health": "/meds/pack-rose.svg",
  Dermatology: "/meds/pack-amber.svg",
};

export function stripImageFor(medicine = {}) {
  const image = String(medicine?.image || "").trim();
  if (image) return image;
  return PACK_ART[String(medicine?.category || "").trim()] || "/meds/pack-navy.svg";
}

export const DIABETES_BP_DOSE_OPTIONS = [
  { id: "glycomet-500", name: "Glycomet 500", brand: "Glycomet", salt: "Metformin", category: "Diabetes" },
  { id: "amaryl-1", name: "Amaryl 1", brand: "Amaryl", salt: "Glimepiride", category: "Diabetes" },
  { id: "glycomet-gp-1", name: "Glycomet-GP 1", brand: "Glycomet GP", salt: "Metformin + Glimepiride", category: "Diabetes" },
  { id: "telma-40", name: "Telma 40", brand: "Telma", salt: "Telmisartan", category: "Hypertension" },
  { id: "amlong-5", name: "Amlong 5", brand: "Amlong", salt: "Amlodipine", category: "Hypertension" },
  { id: "telma-h", name: "Telma-H", brand: "Telma H", salt: "Telmisartan + Hydrochlorothiazide", category: "Hypertension" },
  { id: "losar-50", name: "Losar 50", brand: "Losar", salt: "Losartan", category: "Hypertension" },
  { id: "pantocid-40", name: "Pantocid 40", brand: "Pantocid", salt: "Pantoprazole", category: "Gastric" },
];

export function diabetesBpDoseMedicines() {
  return DIABETES_BP_DOSE_OPTIONS.map((med, index) => doseMedicineFrom(med, index, med));
}

export function doseMedicineFrom(med, index = 0, pack = {}) {
  const name = String(med?.name || pack?.name || "Medicine").trim() || "Medicine";
  const catalogBrand = String(pack?.brand || "").trim();
  const brand =
    catalogBrand && catalogBrand.toLowerCase() !== "medihome" ? catalogBrand : name;
  return {
    id: medicineDoseKey(med, index),
    name,
    brand,
    salt: String(med?.salt || pack?.salt || "").trim(),
    image: stripImageFor({ image: pack?.image, category: pack?.category }),
  };
}

export function readDoseSchedule(storage = globalThis.localStorage) {
  const base = emptyDoseSchedule();
  try {
    const parsed = JSON.parse(storage?.getItem?.(DOSE_REMINDER_KEY) || "null");
    const slots = { ...base.slots };
    DOSE_SLOTS.forEach((slot) => {
      const saved = parsed?.slots?.[slot.id];
      if (!saved || typeof saved !== "object") return;
      const time = /^\d{2}:\d{2}$/.test(String(saved.time || "")) ? String(saved.time) : slot.time;
      const medicines = Array.isArray(saved.medicines)
        ? saved.medicines
            .map((row) => ({
              id: String(row?.id || "").trim(),
              name: String(row?.name || "").trim(),
              brand: String(row?.brand || row?.name || "").trim(),
              salt: String(row?.salt || "").trim(),
              image: String(row?.image || "").trim(),
            }))
            .filter((row) => row.id && row.name)
        : [];
      slots[slot.id] = {
        time,
        alarmOn: Boolean(saved.alarmOn) && medicines.length > 0,
        medicines,
      };
    });
    const fired = parsed?.fired && typeof parsed.fired === "object" ? parsed.fired : {};
    const taken = parsed?.taken && typeof parsed.taken === "object" ? parsed.taken : {};
    return { slots, fired, taken, doseLog: savedDoseLog(parsed) };
  } catch {
    return base;
  }
}

export function writeDoseSchedule(schedule, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(DOSE_REMINDER_KEY, JSON.stringify(schedule));
    globalThis.dispatchEvent?.(new Event(DOSE_REMINDER_EVENT));
  } catch {
    /* keep the on-screen choice even if this browser cannot store it */
  }
  return schedule;
}

export function setDoseMedicines(schedule, slotId, medicines) {
  const current = schedule?.slots?.[slotId] || { time: "08:00", alarmOn: false, medicines: [] };
  const next = (medicines || []).filter((med) => med?.id && med?.name);
  return {
    ...schedule,
    slots: {
      ...schedule.slots,
      [slotId]: {
        ...current,
        medicines: next,
        alarmOn: next.length ? current.alarmOn : false,
      },
    },
  };
}

export function toggleDoseMedicine(schedule, slotId, medicine) {
  const current = schedule?.slots?.[slotId] || { time: "08:00", alarmOn: false, medicines: [] };
  const exists = current.medicines.some((row) => row.id === medicine.id);
  const medicines = exists
    ? current.medicines.filter((row) => row.id !== medicine.id)
    : [...current.medicines, medicine];
  return {
    ...schedule,
    slots: {
      ...schedule.slots,
      [slotId]: {
        ...current,
        medicines,
        alarmOn: medicines.length ? current.alarmOn : false,
      },
    },
  };
}

export function setDoseTime(schedule, slotId, time) {
  const current = schedule?.slots?.[slotId];
  if (!current || !/^\d{2}:\d{2}$/.test(String(time || ""))) return schedule;
  return {
    ...schedule,
    slots: {
      ...schedule.slots,
      [slotId]: { ...current, time: String(time) },
    },
  };
}

export function setDoseAlarm(schedule, slotId, alarmOn) {
  const current = schedule?.slots?.[slotId];
  if (!current) return schedule;
  return {
    ...schedule,
    slots: {
      ...schedule.slots,
      [slotId]: { ...current, alarmOn: Boolean(alarmOn) && current.medicines.length > 0 },
    },
  };
}

export function setAllDoseAlarms(schedule, alarmOn) {
  const slots = { ...schedule.slots };
  Object.keys(slots).forEach((slotId) => {
    const current = slots[slotId];
    const asNeeded = DOSE_SLOTS.some((slot) => slot.id === slotId && slot.asNeeded);
    slots[slotId] = {
      ...current,
      alarmOn: Boolean(alarmOn) && !asNeeded && current.medicines.length > 0,
    };
  });
  return { ...schedule, slots };
}

function clockOf(now) {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function dayOf(now) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function scheduledDoseAlarms(schedule, now = new Date()) {
  const items = [];
  DOSE_SLOTS.forEach((slot) => {
    const row = schedule?.slots?.[slot.id];
    if (slot.asNeeded || !row?.alarmOn || !row.medicines?.length) return;
    if (!/^\d{2}:\d{2}$/.test(String(row.time || ""))) return;
    const [hours, minutes] = row.time.split(":").map(Number);
    for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
      const at = new Date(now);
      at.setDate(at.getDate() + dayOffset);
      at.setHours(hours, minutes, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      const day = dayOf(at);
      items.push({
        slot,
        time: row.time,
        medicines: row.medicines,
        stamp: `${day}|${slot.id}|${row.time}`,
        at: at.getTime(),
      });
    }
  });
  return items;
}

export function dueDoseAlarms(schedule, now = new Date()) {
  const clock = clockOf(now);
  const day = dayOf(now);
  const fired = schedule?.fired || {};
  return DOSE_SLOTS.flatMap((slot) => {
    const row = schedule?.slots?.[slot.id];
    if (slot.asNeeded || !row?.alarmOn || !row.medicines?.length || row.time !== clock) return [];
    const stamp = `${day}|${slot.id}|${row.time}`;
    if (fired[stamp]) return [];
    return [{ slot, time: row.time, medicines: row.medicines, stamp }];
  });
}

function savedDoseLog(parsed) {
  const rows = Array.isArray(parsed?.doseLog) ? parsed.doseLog : [];
  return rows
    .map((row) => ({
      id: String(row?.id || "").trim(),
      stamp: String(row?.stamp || "").trim(),
      at: String(row?.at || "").trim(),
      day: String(row?.day || "").trim(),
      slot: String(row?.slot || "").trim(),
      time: String(row?.time || "").trim(),
      name: String(row?.name || "").trim(),
      brand: String(row?.brand || row?.name || "").trim(),
      salt: String(row?.salt || "").trim(),
      image: String(row?.image || "").trim(),
      taken: row?.taken === true,
    }))
    .filter((row) => row.id && row.brand)
    .slice(-180);
}

export function recordDoseAnswer(schedule, items, taken, now = new Date()) {
  const byId = new Map((schedule?.doseLog || []).map((row) => [row.id, row]));
  (items || []).forEach((item) => {
    (item?.medicines || []).forEach((med) => {
      const brand = String(med?.brand || med?.name || "").trim();
      const id = `${item?.stamp || ""}|${med?.id || brand}`;
      if (!brand || !item?.stamp) return;
      byId.set(id, {
        id,
        stamp: String(item.stamp),
        at: now.toISOString(),
        day: dayOf(now),
        slot: String(item.slot?.plain || "").trim(),
        time: String(item.time || "").trim(),
        name: String(med?.name || brand).trim(),
        brand,
        salt: String(med?.salt || "").trim(),
        image: String(med?.image || "").trim(),
        taken: Boolean(taken),
      });
    });
  });
  return { ...schedule, doseLog: [...byId.values()].slice(-180) };
}

export function missedDoses(schedule) {
  return (schedule?.doseLog || []).filter((row) => row.taken === false).slice().reverse();
}

export function markDoseFired(schedule, stamp, now = new Date()) {
  const day = dayOf(now);
  const fired = {};
  Object.entries(schedule?.fired || {}).forEach(([key, value]) => {
    if (String(key).startsWith(day)) fired[key] = value;
  });
  fired[stamp] = true;
  return { ...schedule, fired };
}
