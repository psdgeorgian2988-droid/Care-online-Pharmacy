import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function memoryStore() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

globalThis.localStorage = memoryStore();
globalThis.sessionStorage = memoryStore();

const {
  CUSTOMER_DATA_RESET_KEY,
  CUSTOMER_DATA_RESET_TOKEN,
  resetCustomerDataThroughToday,
} = await import("./customerDataReset.js");
const { LOGIN_SESSION_KEY, PROFILE_KEY } = await import("./authSession.js");

test("one-time reset clears customer registration and orders", () => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: "Asha", mobile: "9876543210" }));
  localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({ mobile: "9876543210" }));
  localStorage.setItem("mediHomeOrders", JSON.stringify([{ id: "MH-1" }]));
  localStorage.setItem("mediHomePartnerToken", "keep-partner");

  assert.equal(resetCustomerDataThroughToday(), true);
  assert.equal(localStorage.getItem(PROFILE_KEY), null);
  assert.equal(localStorage.getItem(LOGIN_SESSION_KEY), null);
  assert.equal(localStorage.getItem("mediHomeOrders"), null);
  assert.equal(localStorage.getItem("mediHomePartnerToken"), "keep-partner");
  assert.equal(localStorage.getItem(CUSTOMER_DATA_RESET_KEY), CUSTOMER_DATA_RESET_TOKEN);

  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: "New" }));
  assert.equal(resetCustomerDataThroughToday(), false);
  assert.equal(JSON.parse(localStorage.getItem(PROFILE_KEY)).name, "New");
});

test("app boots the one-time wipe and keeps home free of Rx and cart tabs", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("./CustomerHome.jsx", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("./HomeServiceCatalog.jsx", import.meta.url), "utf8");
  const medicines = readFileSync(new URL("./Medicines.jsx", import.meta.url), "utf8");
  const rx = readFileSync(new URL("./HomePrescriptionUpload.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("./App.css", import.meta.url), "utf8");
  assert.match(app, /resetCustomerDataThroughToday\(\)/);
  assert.match(app, /hideCart=\{hideHomeCart\}/);
  assert.match(app, /hideHomeCart \? null : <HeaderCart/);
  assert.match(app, /route === "#medicine-search"/);
  assert.match(app, /HomeCurrentStatus/);
  assert.doesNotMatch(app, /HomePrescriptionUpload/);
  assert.match(home, /HomeCurrentStatus/);
  assert.doesNotMatch(home, /HomePrescriptionUpload/);
  assert.match(catalog, /SectionOrderTools/);
  assert.match(catalog, /SECTION_UPLOAD_RX/);
  assert.match(medicines, /SectionOrderTools/);
  assert.match(medicines, /medicines-order-tools/);
  assert.match(rx, /className="home-rx-tab/);
  assert.doesNotMatch(rx, /HomeCurrentStatus/);
  assert.doesNotMatch(rx, /HeaderCart/);
  const status = readFileSync(new URL("./HomeCurrentStatus.jsx", import.meta.url), "utf8");
  const tools = readFileSync(new URL("./SectionOrderTools.jsx", import.meta.url), "utf8");
  const labs = readFileSync(new URL("./LabTests.jsx", import.meta.url), "utf8");
  const stepdown = readFileSync(new URL("./StepDownCare.jsx", import.meta.url), "utf8");
  const homecare = readFileSync(new URL("./HomeCare.jsx", import.meta.url), "utf8");
  const doctor = readFileSync(new URL("./DoctorAppointment.jsx", import.meta.url), "utf8");
  assert.match(status, /Track/);
  assert.match(status, /if \(!activeOrder\) return null/);
  assert.match(status, /home-status-tab/);
  assert.match(tools, /lab: \["lab"\]/);
  assert.match(tools, /stepdown: \["stepdown"\]/);
  assert.match(tools, /SECTION_UPLOAD_RX = new Set\(\["medicine", "lab", "radiology", "stepdown"\]\)/);
  assert.match(labs, /SectionOrderTools/);
  assert.match(labs, /showUpload/);
  assert.match(stepdown, /SectionOrderTools/);
  assert.match(homecare, /HomeCurrentStatus/);
  assert.match(doctor, /HomeCurrentStatus/);
  assert.match(css, /section-order-tools/);
  assert.match(css, /\.app-home-heading \{[\s\S]*text-align: center/);
});
