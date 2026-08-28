import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareWithPrescribedBrand,
  findMatchingMediHome,
  findPrescribedBrand,
  resolveCartAdd,
} from "./medicineCartCompare.js";

const metforminHome = {
  id: 1,
  brand: "MediHome",
  name: "MediHome Metformin 500 mg",
  salt: "Metformin",
  strength: "500 mg",
  mrp: 50,
  price: 32,
  isMediHome: true,
};
const glycomet = {
  id: 2,
  brand: "Glycomet",
  name: "Glycomet 500",
  salt: "Metformin",
  strength: "500 mg",
  composition: "Metformin 500 mg",
  mrp: 42,
  price: 38,
  isMediHome: false,
};
const glucophage = {
  id: 3,
  brand: "Glucophage",
  name: "Glucophage 500",
  salt: "Metformin",
  strength: "500 mg",
  mrp: 70,
  price: 64,
  isMediHome: false,
};
const telma = {
  id: 4,
  brand: "Telma",
  name: "Telma 40",
  salt: "Telmisartan",
  strength: "40 mg",
  mrp: 90,
  isMediHome: false,
};
const list = [metforminHome, glycomet, glucophage, telma];

test("MediHome SKU matches the same salt and strength", () => {
  assert.equal(findMatchingMediHome(list, glycomet)?.id, 1);
  assert.equal(findMatchingMediHome(list, telma), null);
});

test("prescribed brand prefers the searched pack, else the higher MRP brand", () => {
  assert.equal(findPrescribedBrand(list, metforminHome, glycomet)?.brand, "Glycomet");
  assert.equal(findPrescribedBrand(list, metforminHome)?.brand, "Glucophage");
  assert.equal(findPrescribedBrand(list, glycomet)?.brand, "Glycomet");
});

test("compare uses prescribed MRP against the selling price", () => {
  const compare = compareWithPrescribedBrand(metforminHome, glycomet);
  assert.equal(compare.mrp, 42);
  assert.equal(compare.price, 32);
  assert.equal(compare.save, 10);
  assert.equal(compare.percent, 24);
});

test("adding a prescribed brand puts the matching MediHome pack in the cart", () => {
  const added = resolveCartAdd(glycomet, list, glycomet);
  assert.equal(added.selling.id, 1);
  assert.equal(added.compare.brand, "Glycomet");
  assert.equal(added.compare.save, 10);
});

test("adding MediHome still records the prescribed brand comparison", () => {
  const added = resolveCartAdd(metforminHome, list, glycomet);
  assert.equal(added.selling.id, 1);
  assert.equal(added.compare.brand, "Glycomet");
  assert.equal(added.compare.mrp, 42);
});
