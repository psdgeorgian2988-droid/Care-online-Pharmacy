import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanOcrQuery, matchExactMediHomeFromPhoto } from "./medicineStripSearch.js";

const house50 = {
  id: 1,
  brand: "MediHome",
  name: "MediHome Sitagliptin 50 mg",
  salt: "Sitagliptin",
  strength: "50 mg",
  isMediHome: true,
  aliases: ["Januvia 50", "Zita 50", "Sitagliptin"],
};
const house100 = {
  id: 2,
  brand: "MediHome",
  name: "MediHome Sitagliptin 100 mg",
  salt: "Sitagliptin",
  strength: "100 mg",
  isMediHome: true,
};
const houseCombo = {
  id: 3,
  brand: "MediHome",
  name: "MediHome Sitagliptin 50 mg + Metformin 500 mg",
  salt: "Sitagliptin + Metformin",
  strength: "50 mg + 500 mg",
  isMediHome: true,
};
const januvia50 = {
  id: 10,
  brand: "Januvia",
  name: "Januvia 50",
  salt: "Sitagliptin",
  strength: "50 mg",
  isMediHome: false,
  aliases: ["Sitagliptin"],
};
const janumet = {
  id: 11,
  brand: "Janumet",
  name: "Janumet 50/500",
  salt: "Sitagliptin + Metformin",
  strength: "50 mg + 500 mg",
  isMediHome: false,
};

const list = [house50, house100, houseCombo, januvia50, janumet];

test("photo of Januvia 50 suggests exact MediHome Sitagliptin 50", () => {
  const result = matchExactMediHomeFromPhoto(list, "JANUVIA 50 mg");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, house50.id);
  assert.equal(result.brandMatch.brand, "Januvia");
});

test("photo of sitagliptin 50 does not suggest the 50/500 combination", () => {
  const result = matchExactMediHomeFromPhoto(list, "Sitagliptin 50 mg");
  assert.deepEqual(
    result.items.map((item) => item.id),
    [house50.id]
  );
});

test("photo of sitagliptin metformin 50/500 suggests the exact combination", () => {
  const result = matchExactMediHomeFromPhoto(list, "Sitagliptin Metformin 50 mg 500 mg");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, houseCombo.id);
});

test("clean OCR keeps brand and strength", () => {
  const query = cleanOcrQuery("JANUVIA\n50 mg\nEach uncoated tablet\nMRP 220");
  assert.match(query.toLowerCase(), /januvia/);
  assert.match(query.toLowerCase(), /50/);
});
