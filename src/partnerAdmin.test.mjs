import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PARTNER_CATEGORY_TABS,
  countPartnersInCategory,
  partnerCreateLocation,
  partnerCreateShowsSplit,
  partnerPrimaryKind,
  partnerServicePins,
  partnerUpdateShowsSplit,
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
    "122001",
    "110001",
  ]);
});

test("save partner form collects address and PIN and does not ask for a split", () => {
  assert.equal(partnerCreateShowsSplit("lab"), false);
  assert.equal(partnerCreateShowsSplit("medicine"), false);
  assert.equal(partnerUpdateShowsSplit("lab"), false);
  assert.equal(partnerUpdateShowsSplit("medicine"), true);
  assert.equal(partnerUpdateShowsSplit("radiology"), true);
  const source = readFileSync(new URL("./AdminPartnerLogins.jsx", import.meta.url), "utf8");
  const formStart = source.indexOf('className="admin-partner-create"');
  const form = source.slice(formStart, source.indexOf("</form>", formStart));
  assert.match(form, /value=\{create\.address\}/);
  assert.match(form, /value=\{create\.pin\}/);
  assert.match(form, /placeholder="6-digit PIN"/);
  assert.doesNotMatch(form, /minLength=\{8\}/);
  assert.doesNotMatch(form, /value=\{create\.loginId\}/);
  assert.doesNotMatch(form, /Partner split/);
  assert.doesNotMatch(form, /partnerPercent/);
  assert.match(source, /partnerUpdateShowsSplit\(category\)/);
  assert.match(source, /Update split/);
});
