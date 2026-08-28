import { ledgerShareText } from "./paymentSplit.js";

export async function shareSettlement(split) {
  const text = typeof split === "string" ? split : ledgerShareText(split);
  if (!text) return "";
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "MediHome Settlement Ledger", text });
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "";
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "";
    }
  }
  return "";
}
