/** Send a customer login code by text message, WhatsApp, and mail. */

function textOf(value) {
  return String(value || "").trim();
}

export function smsWebhookUrl(env = process.env) {
  return textOf(env?.MEDIHOME_SMS_WEBHOOK);
}

export function whatsappWebhookUrl(env = process.env) {
  return textOf(env?.MEDIHOME_WHATSAPP_WEBHOOK);
}

export function mailWebhookUrl(env = process.env) {
  return textOf(env?.MEDIHOME_MAIL_WEBHOOK);
}

export function whatsappCloudConfig(env = process.env) {
  return {
    token: textOf(env?.MEDIHOME_WHATSAPP_TOKEN),
    phoneId: textOf(env?.MEDIHOME_WHATSAPP_PHONE_ID),
  };
}

async function postJson(url, payload, fetchImpl) {
  if (!url) return { sent: false, configured: false };
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return { sent: Boolean(response?.ok), configured: true };
  } catch {
    return { sent: false, configured: true };
  }
}

export async function sendCustomerLoginCode(
  { mobile, email, code, purpose = "customer-login" } = {},
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  const text = `MediHome login code: ${code}. It expires in 10 minutes.`;
  const sms = await postJson(
    smsWebhookUrl(env),
    { mobile, text, purpose },
    fetchImpl
  );
  const cloud = whatsappCloudConfig(env);
  let whatsapp = { sent: false, configured: false };
  if (cloud.token && cloud.phoneId) {
    whatsapp = await postJson(
      `https://graph.facebook.com/v20.0/${cloud.phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: `91${mobile}`,
        type: "text",
        text: { body: text },
      },
      async (url, options) =>
        fetchImpl(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${cloud.token}`,
          },
        })
    );
  } else {
    whatsapp = await postJson(
      whatsappWebhookUrl(env),
      { mobile, text, purpose },
      fetchImpl
    );
  }
  const mail = email
    ? await postJson(
        mailWebhookUrl(env),
        {
          to: email,
          subject: "Your MediHome login code",
          text,
          purpose,
        },
        fetchImpl
      )
    : { sent: false, configured: false, skipped: true };
  return { sms, whatsapp, mail };
}

export function customerChannelsConfigured(env = process.env) {
  const cloud = whatsappCloudConfig(env);
  return Boolean(
    smsWebhookUrl(env) ||
      whatsappWebhookUrl(env) ||
      (cloud.token && cloud.phoneId) ||
      mailWebhookUrl(env)
  );
}
