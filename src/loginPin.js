export function normalizeLoginPin(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 6);
  return /^\d{6}$/.test(digits) ? digits : "";
}

export function profileLoginPin(profile = {}) {
  return (
    normalizeLoginPin(profile.loginPin) || normalizeLoginPin(profile.pinCode)
  );
}

export function pickLoginPin(source = {}, previous = {}) {
  return (
    normalizeLoginPin(source.loginPin) ||
    normalizeLoginPin(previous.loginPin) ||
    ""
  );
}
