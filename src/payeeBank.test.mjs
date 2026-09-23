import test from "node:test";
import assert from "node:assert/strict";
import {
  PAYEE_BANK,
  publicSettlementCredit,
  publicSplit,
  settlementBankCredit,
} from "./payeeBank.js";
import { splitPayment } from "./paymentSplit.js";
import { PAYMENT_METHOD_OPTIONS } from "./paymentMethods.js";

test("settlement bank stays in the backend record", () => {
  assert.equal(PAYEE_BANK.accountName, "Manju Bala");
  assert.equal(PAYEE_BANK.accountNumber, "31645319558");
  assert.equal(PAYEE_BANK.ifsc, "SBIN0004458");
  assert.equal(PAYEE_BANK.micr, "110002414");
  const credit = settlementBankCredit(200);
  assert.equal(credit.accountNumber, "31645319558");
  assert.equal(credit.amountRupees, 200);
});

test("public split credits MediHome share without account numbers", () => {
  const split = publicSplit(
    splitPayment("lab", 1000, "110001", {
      paymentMethod: "upi",
      paidOn: "customer",
    })
  );
  assert.equal(split.medihomeCreditDest, "settlement_bank");
  assert.equal(split.medihomeCreditRupees, split.platformSettledRupees);
  assert.equal(split.accountNumber, undefined);
  assert.equal(JSON.stringify(split).includes("31645319558"), false);
  assert.deepEqual(publicSettlementCredit(150), {
    dest: "settlement_bank",
    amountRupees: 150,
  });
});

test("bank account remains a checkout payment mode", () => {
  assert.equal(
    PAYMENT_METHOD_OPTIONS.some((option) => option.value === "bank"),
    true
  );
});
