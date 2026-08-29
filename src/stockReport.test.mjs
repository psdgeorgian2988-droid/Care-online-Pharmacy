import test from "node:test";
import assert from "node:assert/strict";
import {
  STOCK_COVER,
  brandStoreMatrix,
  itemBrand,
  mergeStockRows,
  skuKey,
  soldFromOrders,
  stockStatus,
  stockTarget,
  toMaintain,
} from "./stockReport.js";

test("target stock is sales times 1.5, then minus current", () => {
  assert.equal(STOCK_COVER, 1.5);
  assert.equal(stockTarget(10), 15);
  assert.equal(toMaintain(10, 4), 11);
  assert.equal(toMaintain(10, 20), -5);
  assert.equal(stockStatus(10, 0), "Out Of Stock");
  assert.equal(stockStatus(10, 4), "Need Stock");
  assert.equal(stockStatus(10, 15), "OK");
  assert.equal(stockStatus(10, 20), "Surplus");
});

test("sales roll up by store, brand, and SKU", () => {
  const orders = [
    {
      kind: "medicine",
      outletId: "MH-OUT-GGN",
      outletName: "Gurugram Outlet",
      bookedAtMs: 100,
      items: [
        { id: 82, name: "MediHome Telmisartan 20 mg", quantity: 2 },
        { id: 1, brand: "Dolo", name: "Dolo 650", quantity: 3 },
      ],
    },
    {
      kind: "medicine",
      outletId: "MH-OUT-GGN",
      outletName: "Gurugram Outlet",
      bookedAtMs: 200,
      items: [{ id: 82, name: "MediHome Telmisartan 20 mg", quantity: 1 }],
    },
    {
      kind: "ambulance",
      outletId: "MH-OUT-GGN",
      items: [{ id: 82, quantity: 9 }],
    },
  ];
  assert.equal(itemBrand({ name: "MediHome Telmisartan 20 mg" }), "MediHome");
  assert.equal(skuKey({ id: 82 }), "id:82");
  const sold = soldFromOrders(orders, 0, 300);
  const telmi = sold.find((row) => row.skuKey === "id:82");
  const dolo = sold.find((row) => row.skuKey === "id:1");
  assert.equal(telmi.sold, 3);
  assert.equal(telmi.brand, "MediHome");
  assert.equal(dolo.sold, 3);
  assert.equal(dolo.brand, "Dolo");

  const rows = mergeStockRows(sold, [
    { outletId: "MH-OUT-GGN", skuKey: "id:82", qty: 1, brand: "MediHome", name: "MediHome Telmisartan 20 mg" },
  ]);
  const telmiRow = rows.find((row) => row.skuKey === "id:82");
  assert.equal(telmiRow.current, 1);
  assert.equal(telmiRow.target, 5);
  assert.equal(telmiRow.maintain, 4);

  const matrix = brandStoreMatrix(rows, [
    { id: "MH-OUT-GGN", name: "Gurugram Outlet" },
    { id: "MH-OUT-CD", name: "Central Delhi Outlet" },
  ]);
  const medi = matrix.find((row) => row.brand === "MediHome");
  assert.equal(medi.cells[0].maintain, 4);
  assert.equal(medi.cells[1].current, 0);
});
