import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisRange,
  analysisToCsv,
  changePct,
  compareGroups,
  filterReport,
  kindGroup,
  monthlyMatrix,
  orderOutlet,
  pinGroup,
  previousRange,
  summarizeSales,
} from "./salesReport.js";

const now = Date.parse("2026-08-27T12:00:00+05:30");

const orders = [
  { id: "1", kind: "medicine", total: 100, pinCode: "122017", outletId: "A", outletName: "Gurugram", bookedAtMs: Date.parse("2026-08-10T10:00:00+05:30") },
  { id: "2", kind: "lab", total: 400, pinCode: "110001", outletId: "B", outletName: "CP", bookedAtMs: Date.parse("2026-08-20T10:00:00+05:30") },
  { id: "3", kind: "medicine", total: 80, pinCode: "122017", outletId: "A", outletName: "Gurugram", bookedAtMs: Date.parse("2026-07-10T10:00:00+05:30") },
  { id: "4", kind: "lab", total: 200, pinCode: "110001", outletId: "B", outletName: "CP", bookedAtMs: Date.parse("2026-07-20T10:00:00+05:30") },
  { id: "5", kind: "ambulance", total: 1500, pinCode: "110075", outletId: "C", outletName: "Dwarka", bookedAtMs: Date.parse("2026-01-05T10:00:00+05:30") },
];

test("today / MTD / YTD sales use IST calendar bounds", () => {
  const sales = summarizeSales(orders, now);
  assert.equal(sales.today.amount, 0);
  assert.equal(sales.mtd.amount, 500);
  assert.equal(sales.mtd.count, 2);
  assert.equal(sales.ytd.amount, 2280);
});

test("new business is not reported as +100%", () => {
  assert.equal(changePct(200, 0), null);
  assert.equal(changePct(0, 0), 0);
  assert.equal(changePct(150, 100), 50);
  assert.equal(changePct(80, 100), -20);
});

test("service comparison uses an equal previous window", () => {
  const range = analysisRange("mtd", now);
  const prev = previousRange(range);
  const current = orders.filter((row) => row.bookedAtMs >= range.fromMs && row.bookedAtMs <= range.toMs);
  const previous = orders.filter((row) => row.bookedAtMs >= prev.fromMs && row.bookedAtMs <= prev.toMs);
  const rows = compareGroups(current, previous, kindGroup);
  const medicine = rows.find((row) => row.key === "medicine");
  assert.equal(medicine.current, 100);
  assert.equal(medicine.previous, 80);
  assert.equal(medicine.pct, 25);
});

test("month matrix splits service, PIN, and store across months", () => {
  const byService = monthlyMatrix(orders, kindGroup, 12, now);
  const aug = byService.months.find((month) => month.key === "2026-08");
  const medicine = byService.rows.find((row) => row.key === "medicine");
  assert.ok(aug);
  assert.equal(medicine.byMonth["2026-08"].amount, 100);
  assert.equal(medicine.byMonth["2026-07"].amount, 80);

  const byPin = monthlyMatrix(orders, pinGroup, 12, now);
  assert.equal(byPin.rows.find((row) => row.key === "122017").amount, 180);

  const byStore = monthlyMatrix(orders, orderOutlet, 12, now);
  assert.equal(byStore.rows.find((row) => row.key === "A").label.includes("Gurugram"), true);
});

test("custom report filter and analysis CSV include breakdowns", () => {
  const rows = filterReport(orders, { period: "custom", kind: "all", from: "2026-08-01", to: "2026-08-31" }, now);
  assert.equal(rows.length, 2);
  const csv = analysisToCsv({
    periodLabel: "Month to date",
    currentLabel: "Now",
    previousLabel: "Prev",
    service: compareGroups(rows, [], kindGroup),
    pin: compareGroups(rows, [], pinGroup),
    store: compareGroups(rows, [], orderOutlet),
    payment: [],
    matrixService: monthlyMatrix(orders, kindGroup, 3, now),
    matrixPin: monthlyMatrix(orders, pinGroup, 3, now),
    matrixStore: monthlyMatrix(orders, orderOutlet, 3, now),
    orders: rows,
  });
  assert.match(csv, /SERVICE GROWTH/);
  assert.match(csv, /MONTH-WISE BY PIN/);
  assert.match(csv, /122017/);
});
