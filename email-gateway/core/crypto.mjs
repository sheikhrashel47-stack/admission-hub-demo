const encoder = new TextEncoder();

export const utf8 = value => encoder.encode(String(value));

export const bytesToHex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');

export const bytesToBase64 = bytes => {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const bytesToBase64Url = bytes => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export const hexToBytes = hex => {
  const clean = String(hex || '').toLowerCase();
  if (!/^[a-f0-9]*$/.test(clean) || clean.length % 2) return new Uint8Array();
  return Uint8Array.from(clean.match(/.{2}/g) || [], value => Number.parseInt(value, 16));
};

const cryptoApi = supplied => supplied || globalThis.crypto;

export async function sha256Bytes(value, suppliedCrypto) {
  const api = cryptoApi(suppliedCrypto);
  if (!api?.subtle) throw new Error('Web Crypto is required.');
  return new Uint8Array(await api.subtle.digest('SHA-256', value instanceof Uint8Array ? value : utf8(value)));
}

export async function sha256Hex(value, suppliedCrypto) {
  return bytesToHex(await sha256Bytes(value, suppliedCrypto));
}

export async function hmacSha256Bytes(secret, value, suppliedCrypto) {
  const api = cryptoApi(suppliedCrypto);
  if (!api?.subtle) throw new Error('Web Crypto is required.');
  const keyBytes = secret instanceof Uint8Array ? secret : utf8(secret);
  const key = await api.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await api.subtle.sign('HMAC', key, value instanceof Uint8Array ? value : utf8(value)));
}

export async function hmacSha256Hex(secret, value, suppliedCrypto) {
  return bytesToHex(await hmacSha256Bytes(secret, value, suppliedCrypto));
}

export async function hmacSha256Base64Url(secret, value, suppliedCrypto) {
  return bytesToBase64Url(await hmacSha256Bytes(secret, value, suppliedCrypto));
}

export function timingSafeEqual(left, right) {
  const a = utf8(String(left || ''));
  const b = utf8(String(right || ''));
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) mismatch |= (a[index % (a.length || 1)] || 0) ^ (b[index % (b.length || 1)] || 0);
  return mismatch === 0;
}

export async function hashPrivateReference(value, pepper, suppliedCrypto) {
  if (!pepper || String(pepper).length < 16) throw new Error('A private reference pepper is required.');
  return (await hmacSha256Hex(pepper, String(value).trim().toLowerCase(), suppliedCrypto)).slice(0, 32);
}

export function stableNumber(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
