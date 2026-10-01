export function partnerResetDeliveryMessage(data = {}) {
  if (data.smsSent) {
    return data.maskedMobile
      ? `OTP sent to ${data.maskedMobile}.`
      : "OTP sent to the registered mobile.";
  }
  if (data.devOtp) {
    return `No SMS gateway is configured, so the OTP was not texted. Development code: ${data.devOtp}.`;
  }
  return data.message || "No SMS gateway is configured, so the OTP was not texted.";
}

export function partnerPasswordResetLabel(partner) {
  const at = Number(partner?.passwordResetAt || 0);
  if (!at) return "";
  const when = new Date(at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Password reset · ${when}`;
}
