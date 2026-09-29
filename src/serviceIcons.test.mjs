import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./serviceIcons.jsx", import.meta.url), "utf8");

function toneColors() {
  return [...source.matchAll(/(\w+):\s*\{\s*color:\s*"(#[0-9a-fA-F]{6})"/g)].map((row) => [
    row[1],
    row[2],
  ]);
}

test("each customer service has a distinct icon color", () => {
  const colors = toneColors();
  const keys = colors.map(([key]) => key);
  const values = colors.map(([, color]) => color);
  for (const key of [
    "account",
    "medicine",
    "lab",
    "orders",
    "doctor",
    "record",
    "homecare",
    "vaccination",
    "radiology",
    "psychologist",
    "stepdown",
    "ambulance",
  ]) {
    assert.ok(keys.includes(key), key);
  }
  assert.equal(new Set(values).size, values.length);
  assert.doesNotMatch(source, /stroke="currentColor"/);
  assert.match(source, /vitamins:\s*"medicine"/);
  assert.match(source, /mri:\s*"radiology"/);
});
