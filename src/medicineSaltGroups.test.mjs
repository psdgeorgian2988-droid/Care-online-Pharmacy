import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupMedicineFamilies,
  medicineInCategory,
} from "./medicineSaltGroups.js";

const sitagliptin50 = {
  id: 1,
  salt: "Sitagliptin",
  strength: "50 mg",
};
const combo = {
  id: 2,
  salt: "Sitagliptin + Metformin",
  strength: "50 mg + 500 mg",
};
const metformin500 = {
  id: 3,
  salt: "Metformin",
  strength: "500 mg",
};

test("Gastro medicines belong on the Gastric tab", () => {
  assert.equal(
    medicineInCategory({ category: "Gastro" }, "Gastric"),
    true
  );
  assert.equal(
    medicineInCategory({ category: "Diabetes" }, "Hypertension"),
    false
  );
});

test("combination SKUs appear on every salt tab", () => {
  const families = groupMedicineFamilies([sitagliptin50, combo, metformin500]);
  const sitagliptin = families.find((family) => family.name === "Sitagliptin");
  const metformin = families.find((family) => family.name === "Metformin");
  assert.ok(sitagliptin);
  assert.ok(metformin);
  assert.deepEqual(
    sitagliptin.items.map((item) => item.id).sort(),
    [1, 2]
  );
  assert.deepEqual(
    metformin.items.map((item) => item.id).sort(),
    [2, 3]
  );
});
