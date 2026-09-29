import test from "node:test";
import assert from "node:assert/strict";
import {
  PARTNER_CATEGORY_TABS,
  countPartnersInCategory,
  partnerCreateLocation,
  partnerPrimaryKind,
  partnerServicePins,
  partnersInCategory,
} from "./partnerAdmin.js";

const partners = [
  { id: "1", name: "Neha", kinds: ["lab"] },
  { id: "2", name: "Amit", kinds: ["medicine"] },
  { id: "3", name: "Scan", kinds: ["radiology", "lab"] },
];

test("partner category tabs cover every service except all/refund", () => {
  assert.deepEqual(
    PARTNER_CATEGORY_TABS.map((tab) => tab.value),
    [
      "medicine",
      "lab",
      "radiology",
      "homecare",
      "vaccination",
      "doctor",
      "psychologist",
      "stepdown",
      "ambulance",
    ]
  );
});

test("partners list by category and keep multi-kind partners on each tab", () => {
  assert.equal(partnerPrimaryKind(partners[0]), "lab");
  assert.equal(countPartnersInCategory(partners, "lab"), 2);
  assert.equal(partnersInCategory(partners, "medicine")[0].name, "Amit");
  assert.equal(partnersInCategory(partners, "radiology")[0].name, "Scan");
});

test("new partner needs address and a 6-digit PIN for allocation", () => {
  assert.equal(partnerCreateLocation({ address: "", pin: "110001" }).ok, false);
  assert.equal(partnerCreateLocation({ address: "CP Delhi", pin: "1100" }).ok, false);
  const ok = partnerCreateLocation({ address: "  CP Delhi  ", pin: "110001" });
  assert.equal(ok.ok, true);
  assert.equal(ok.pin, "110001");
  assert.deepEqual(ok.pins, ["110001"]);
  assert.deepEqual(partnerServicePins({ pins: ["110001"], pinCode: "122001" }), [
    "110001",
    "122001",
  ]);
});
