import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectorCapacity } from "../src/labSlots.js";

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "slot-capacity.json");

export function chosenSlotCapacity(saved, fallback) {
  const value = Number(saved);
  if (Number.isInteger(value) && value >= 1 && value <= 20) return value;
  const base = Number(fallback);
  return Number.isInteger(base) && base > 0 ? base : 3;
}

async function readSlotCapacities() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return parsed && typeof parsed.capacities === "object" && parsed.capacities ? parsed.capacities : {};
  } catch {
    return {};
  }
}

export async function slotCapacityFor(labId, partners = []) {
  const id = String(labId || "").trim();
  const saved = id ? (await readSlotCapacities())[id] : undefined;
  return chosenSlotCapacity(saved, collectorCapacity(partners, id));
}

export async function writeSlotCapacity(labId, capacity) {
  const id = String(labId || "").trim();
  const count = Number(capacity);
  if (!id || !Number.isInteger(count) || count < 1 || count > 20) {
    return { ok: false, error: "Choose 1 to 20 bookings for each slot." };
  }
  const capacities = await readSlotCapacities();
  capacities[id] = count;
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify({ capacities }, null, 2)}\n`);
  return { ok: true, labId: id, capacity: count };
}
