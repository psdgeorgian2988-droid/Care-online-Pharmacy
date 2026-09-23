/** Backend-only MediHome settlement account. Do not render these details in apps. */
export const PAYEE_BANK = {
  accountName: "Manju Bala",
  accountNumber: "31645319558",
  ifsc: "SBIN0004458",
  micr: "110002414",
  bankName: "State Bank of India",
};

export function settlementBankCredit(amountRupees, payee = PAYEE_BANK) {
  return {
    dest: "settlement_bank",
    amountRupees: Math.max(0, Number(amountRupees) || 0),
    accountName: payee.accountName,
    accountNumber: payee.accountNumber,
    ifsc: payee.ifsc,
    micr: payee.micr,
    bankName: payee.bankName,
  };
}

export function publicSettlementCredit(amountRupees) {
  return {
    dest: "settlement_bank",
    amountRupees: Math.max(0, Number(amountRupees) || 0),
  };
}

export function publicSplit(split) {
  if (!split || typeof split !== "object") return split;
  const amount = Number(
    split.medihomeCreditRupees ?? split.platformSettledRupees ?? split.medihomeAccountRupees ?? 0
  );
  const next = {
    ...split,
    medihomeCreditDest: "settlement_bank",
    medihomeCreditRupees: amount,
  };
  delete next.accountNumber;
  delete next.ifsc;
  delete next.micr;
  delete next.accountName;
  delete next.settlementBank;
  return next;
}
