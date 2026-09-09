import { AUTH_ERROR_CODES, failAuth } from './errors.mjs';

const encoder = new TextEncoder();
const EMAIL_LOCAL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function normalizeAuthEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254 || email.includes('..')) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || !EMAIL_LOCAL.test(local)) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(label => !DOMAIN_LABEL.test(label))) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  if (labels.at(-1).length < 2 || labels.at(-1).length > 63) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  return email;
}

export function maskAuthEmail(email) {
  const normalized = normalizeAuthEmail(email);
  const [local, domain] = normalized.split('@');
  const labels = domain.split('.');
  const localMask = local.length < 3 ? `${local[0]}••` : `${local.slice(0, 2)}${'•'.repeat(Math.min(5, Math.max(2, local.length - 2)))}`;
  const host = labels[0];
  const hostMask = `${host[0]}${'•'.repeat(Math.min(4, Math.max(2, host.length - 1)))}`;
  return `${localMask}@${hostMask}.${labels.slice(1).join('.')}`;
}

const bytesToBase64Url = bytes => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export function randomToken(byteLength = 32, cryptoImpl = globalThis.crypto) {
  const size = Math.max(16, Math.min(64, Number(byteLength) || 32));
  if (!cryptoImpl || typeof cryptoImpl.getRandomValues !== 'function') failAuth(AUTH_ERROR_CODES.NOT_CONFIGURED);
  const bytes = new Uint8Array(size);
  cryptoImpl.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function randomSixDigitOtp(cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl || typeof cryptoImpl.getRandomValues !== 'function') failAuth(AUTH_ERROR_CODES.NOT_CONFIGURED);
  const range = 1_000_000;
  const ceiling = Math.floor(0x1_0000_0000 / range) * range;
  const word = new Uint32Array(1);
  for (let attempt = 0; attempt < 128; attempt += 1) {
    cryptoImpl.getRandomValues(word);
    if (word[0] < ceiling) return String(word[0] % range).padStart(6, '0');
  }
  failAuth(AUTH_ERROR_CODES.INTERNAL_ERROR);
}

export function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index % Math.max(1, a.length)) || 0) ^ (b.charCodeAt(index % Math.max(1, b.length)) || 0);
  }
  return mismatch === 0;
}

export class AuthHmac {
  constructor(secret, cryptoImpl = globalThis.crypto) {
    const value = String(secret || '');
    if (value.length < 32 || /[\r\n\u0000]/.test(value)) failAuth(AUTH_ERROR_CODES.NOT_CONFIGURED);
    if (!cryptoImpl?.subtle) failAuth(AUTH_ERROR_CODES.NOT_CONFIGURED);
    this.crypto = cryptoImpl;
    this.key = cryptoImpl.subtle.importKey('raw', encoder.encode(value), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }

  async hex(context, value) {
    const key = await this.key;
    const signature = await this.crypto.subtle.sign('HMAC', key, encoder.encode(`${String(context)}\u0000${String(value)}`));
    return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export function coarseUserAgent(value) {
  const ua = String(value || '').slice(0, 300);
  const device = /iPhone/i.test(ua) ? 'iPhone'
    : /iPad/i.test(ua) ? 'iPad'
      : /Android/i.test(ua) ? 'Android'
        : /Windows/i.test(ua) ? 'Windows'
          : /Macintosh|Mac OS/i.test(ua) ? 'Mac'
            : /Linux/i.test(ua) ? 'Linux' : 'Browser';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /Firefox\//i.test(ua) ? 'Firefox'
      : /Chrome\//i.test(ua) ? 'Chrome'
        : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return `${device} · ${browser}`;
}
