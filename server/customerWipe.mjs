import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");

export const CUSTOMER_WIPE_TOKEN = "2026-10-20";

/** Empty live customer orders, payments, and notifications through 20 Oct 2026. */
export async function wipeCustomerServerDataThroughToday(dir = dataDir) {
  const stampPath = path.join(dir, ".customer-wipe");
  try {
    const done = (await readFile(stampPath, "utf8")).trim();
    if (done === CUSTOMER_WIPE_TOKEN) return false;
  } catch {
    /* first run */
  }

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "orders.json"), `${JSON.stringify({ orders: [] }, null, 2)}\n`);
  await writeFile(path.join(dir, "payments.json"), `${JSON.stringify({ payments: [] }, null, 2)}\n`);
  await writeFile(
    path.join(dir, "customer-notifications.json"),
    `${JSON.stringify({ notifications: [] }, null, 2)}\n`
  );
  await writeFile(stampPath, `${CUSTOMER_WIPE_TOKEN}\n`);
  if (dir === dataDir) {
    console.log("Cleared customer orders and payments through 20 Oct 2026.");
  }
  return true;
}
