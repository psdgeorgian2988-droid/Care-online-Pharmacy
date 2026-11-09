import assert from "node:assert/strict";
import test from "node:test";
import { pullRecordLibrary } from "./recordLibrary.js";

test("a booking report is saved into the record library for that mobile", async () => {
  const storage = {
    value: "[]",
    getItem() {
      return this.value;
    },
    setItem(_key, next) {
      this.value = next;
    },
  };
  const order = {
    id: "MH-LAB-42",
    kind: "lab",
    mobile: "9810012345",
    patientName: "Asha Singh",
    reportFileName: "CBC.pdf",
    reportFileType: "application/pdf",
    reportFileData: "data:application/pdf;base64,abc",
  };
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () => (String(url).includes("/lookup") ? { order } : { orders: [order] }),
  });
  const { records } = await pullRecordLibrary("9810012345", { storage, fetchImpl });
  assert.equal(records.length, 1);
  assert.match(storage.value, /CBC\.pdf/);
  assert.match(storage.value, /Asha Singh/);
});
