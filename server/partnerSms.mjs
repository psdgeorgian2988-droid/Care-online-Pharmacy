/** Partner password-reset SMS hook. A gateway is optional; the verify path does not depend on it. */

export function otpDevEnabled(env = process.env) {
  return String(env?.MEDIHOME_OTP_DEV || "").trim() === "1";
}

export function smsWebhookUrl(env = process.env) {
  return String(env?.MEDIHOME_SMS_WEBHOOK || "").trim();
}

const NO_GATEWAY_MESSAGE =
  "No SMS gateway is configured, so the OTP was not texted. Set MEDIHOME_SMS_WEBHOOK to deliver it. On a development machine, set MEDIHOME_OTP_DEV=1 to reveal the code.";

/**
 * Sends a password-reset OTP if MEDIHOME_SMS_WEBHOOK is set.
 * Logs and reveals nothing unless MEDIHOME_OTP_DEV=1.
 * The return value never includes the code.
 */
export async function sendPartnerOtpSms(
  { mobile, code, purpose } = {},
  { env = process.env, fetchImpl = globalThis.fetch, log = console } = {}
) {
  if (otpDevEnabled(env)) {
    log.info?.(`[partner-otp] ${purpose || "reset"} ${mobile} ${code}`);
  }
  const webhook = smsWebhookUrl(env);
  if (!webhook) {
    return { sent: false, gateway: false, message: NO_GATEWAY_MESSAGE };
  }
  const text =
    purpose === "partner-split"
      ? `MediHome split update code: ${code}. It expires in 10 minutes.`
      : `MediHome partner password reset code: ${code}. It expires in 10 minutes.`;
  try {
    const response = await fetchImpl(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile,
        text,
        purpose: purpose || "partner-password-reset",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response?.ok) {
      return {
        sent: false,
        gateway: true,
        message: "The SMS gateway did not accept the OTP, so it was not texted.",
      };
    }
    return { sent: true, gateway: true, message: "OTP sent to the registered mobile." };
  } catch {
    return {
      sent: false,
      gateway: true,
      message: "The SMS gateway could not be reached, so the OTP was not texted.",
    };
  }
}
