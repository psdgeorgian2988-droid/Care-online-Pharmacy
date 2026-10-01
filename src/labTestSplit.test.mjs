import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mergeAddedLabTests,
  partnerPercentOnTest,
  stampLabOrderTests,
  validateAddedLabTest,
} from "./labTestSplit.js";
import { splitExtrasForAssignedPartner } from "./paymentSplit.js";
import { partnerCreateShowsSplit, partnerUpdateShowsSplit } from "./partnerAdmin.js";
import { DIAGNOSTIC_LABS } from "./diagnosticPartners.js";

test("add-partner hides split in every category; admin update still sets a percent", () => {
  assert.equal(partnerCreateShowsSplit("lab"), false);
  assert.equal(partnerCreateShowsSplit("radiology"), false);
  assert.equal(partnerCreateShowsSplit("medicine"), false);
  assert.equal(partnerUpdateShowsSplit("lab"), false);
  assert.equal(partnerUpdateShowsSplit("medicine"), true);
  const partnersForm = readFileSync(new URL("./AdminPartnerLogins.jsx", import.meta.url), "utf8");
  const formStart = partnersForm.indexOf('className="admin-partner-create"');
  const createForm = partnersForm.slice(formStart, partnersForm.indexOf("</form>", formStart));
  assert.doesNotMatch(createForm, /Partner split/);
  assert.match(partnersForm, /partnerUpdateShowsSplit\(category\)/);
  assert.match(partnersForm, /Update split/);
  const customer = readFileSync(new URL("./LabTests.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(customer, /Partner split/);
  const partner = readFileSync(new URL("./Partner.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(partner, /Partner split/);
  const orders = readFileSync(new URL("./Admin.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(orders, /Partner split percent for order/);
  const detail = readFileSync(new URL("./OrderFullView.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(detail, /Staff split/);
  const labAdmin = readFileSync(new URL("./AdminLabTests.jsx", import.meta.url), "utf8");
  assert.match(labAdmin, /Partner split %/);
  assert.match(labAdmin, /Update split/);
});

test("pathcare catalog split comes from transfer price, and new tests require a percent", () => {
  const vitamin = DIAGNOSTIC_LABS.find((lab) => lab.id === "pathcare").tests.find(
    (row) => row.id === "BC004"
  );
  assert.equal(partnerPercentOnTest(vitamin), Math.round((vitamin.tp / vitamin.price) * 100));
  assert.equal(validateAddedLabTest({ name: "CBC panel", price: 499 }).ok, false);
  const added = validateAddedLabTest({ name: "CBC panel", price: 499, partnerPercent: 72 });
  assert.equal(added.ok, true);
  assert.equal(added.test.partnerPercent, 72);
  assert.equal(added.test.labId, "others");
});

test("added lab tests merge onto Others and override a spoofed booking percent", () => {
  const labs = [
    { id: "others", tests: [{ id: "cbc", name: "CBC", price: 399 }] },
    { id: "metropolis", tests: [{ id: "cbc", name: "CBC", price: 499 }] },
  ];
  const merged = mergeAddedLabTests(labs, [
    { id: "LT-1", name: "New panel", price: 800, partnerPercent: 70, labId: "others" },
  ]);
  assert.equal(merged[0].tests.some((row) => row.name === "New panel" && row.partnerPercent === 70), true);
  assert.equal(merged[1].tests.some((row) => row.name === "New panel"), false);

  const stamped = stampLabOrderTests(
    [{ id: "cbc", name: "Complete Blood Count (CBC)", price: 499, partnerPercent: 100, partnerId: "metropolis" }],
    { labId: "metropolis", added: [] }
  );
  assert.equal(stamped[0].partnerPercent, 85);
  assert.equal(stamped[0].tp, undefined);

  const custom = stampLabOrderTests(
    [{ id: "LT-1", name: "New panel", price: 800, partnerPercent: 100 }],
    { labId: "others", added: [{ id: "LT-1", name: "New panel", price: 800, partnerPercent: 70 }] }
  );
  assert.equal(custom[0].partnerPercent, 70);
});

test("assigning a lab partner does not apply the partner record percent", () => {
  const tests = [{ id: "cbc", price: 400, partnerPercent: 80 }];
  assert.deepEqual(
    splitExtrasForAssignedPartner({ kind: "lab", tests }, { partnerPercent: 55 }),
    { tests }
  );
  assert.deepEqual(
    splitExtrasForAssignedPartner({ kind: "medicine", tests }, { partnerPercent: 60 }),
    { partnerPercent: 60 }
  );
});
