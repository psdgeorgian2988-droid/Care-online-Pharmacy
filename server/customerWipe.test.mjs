import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CUSTOMER_WIPE_TOKEN, wipeCustomerServerDataThroughToday } from "./customerWipe.mjs";

test("one-time server wipe empties orders and skips the second run", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "medihome-wipe-"));
  await writeFile(path.join(dir, "orders.json"), JSON.stringify({ orders: [{ id: "MH-OLD" }] }));
  await writeFile(path.join(dir, "payments.json"), JSON.stringify({ payments: [{ id: "pay-1" }] }));
  await writeFile(
    path.join(dir, "customer-notifications.json"),
    JSON.stringify({ notifications: [{ id: "n-1" }] })
  );

  assert.equal(await wipeCustomerServerDataThroughToday(dir), true);
  assert.deepEqual(JSON.parse(await readFile(path.join(dir, "orders.json"), "utf8")), { orders: [] });
  assert.deepEqual(JSON.parse(await readFile(path.join(dir, "payments.json"), "utf8")), {
    payments: [],
  });
  assert.deepEqual(
    JSON.parse(await readFile(path.join(dir, "customer-notifications.json"), "utf8")),
    { notifications: [] }
  );
  assert.equal((await readFile(path.join(dir, ".customer-wipe"), "utf8")).trim(), CUSTOMER_WIPE_TOKEN);

  await writeFile(path.join(dir, "orders.json"), JSON.stringify({ orders: [{ id: "MH-NEW" }] }));
  assert.equal(await wipeCustomerServerDataThroughToday(dir), false);
  assert.equal(JSON.parse(await readFile(path.join(dir, "orders.json"), "utf8")).orders[0].id, "MH-NEW");
});

test("server start always rebuilds when the git stamp changes", () => {
  const index = readFileSync(new URL("./index.mjs", import.meta.url), "utf8");
  assert.match(index, /wipeCustomerServerDataThroughToday/);
  assert.match(index, /ensureWebsiteBuild\(distDir\)/);
  assert.doesNotMatch(index, /if \(!distReady\) \{\s*ensureWebsiteBuild/);
});
