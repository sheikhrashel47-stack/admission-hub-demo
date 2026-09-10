const WEBHOOK_CONTEXT = 'admission-hub-telegram-webhook-v1';
const SECRET_PATTERN = /^[A-Za-z0-9_-]{20,256}$/;

const safeRootSecret = value => {
  const text = String(value || '');
  return text.length >= 32 && text.length <= 4096 && !/[\r\n\u0000]/.test(text) ? text : '';
};

const base64Url = bytes => {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const validTelegramWebhookSecret = value => SECRET_PATTERN.test(String(value || ''));

export async function deriveTelegramWebhookSecret(rootSecret, cryptoImpl = globalThis.crypto) {
  const source = safeRootSecret(rootSecret);
  if (!source || !cryptoImpl?.subtle) return '';
  try {
    const encoder = new TextEncoder();
    const key = await cryptoImpl.subtle.importKey(
      'raw',
      encoder.encode(source),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await cryptoImpl.subtle.sign('HMAC', key, encoder.encode(WEBHOOK_CONTEXT));
    const derived = base64Url(signature);
    return validTelegramWebhookSecret(derived) ? derived : '';
  } catch { return ''; }
}

export async function resolveTelegramWebhookSecret(env = {}, cryptoImpl = globalThis.crypto) {
  const explicit = String(env?.TELEGRAM_AUTH_WEBHOOK_SECRET || '');
  if (validTelegramWebhookSecret(explicit)) return explicit;
  return deriveTelegramWebhookSecret(env?.AUTH_HMAC_SECRET, cryptoImpl);
}

export const __telegramSecurityTest = Object.freeze({ WEBHOOK_CONTEXT, safeRootSecret, base64Url });
