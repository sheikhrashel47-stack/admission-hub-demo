import { AUTH_ERROR_CODES, NativeAuthError } from './errors.mjs';
import { bytesToBase64Url, base64UrlToBytes } from './webauthn.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const fail = () => { throw new NativeAuthError(AUTH_ERROR_CODES.STORAGE_UNAVAILABLE); };

export class AuthSecretVault {
  constructor(secret, cryptoImpl = globalThis.crypto) {
    const raw = String(secret || '');
    if (raw.length < 32 || raw.length > 4096 || /[\r\n\u0000]/.test(raw) || !cryptoImpl?.subtle) fail();
    this.crypto = cryptoImpl;
    this.key = cryptoImpl.subtle.digest('SHA-256', encoder.encode(`admission-hub-auth-vault-v1\0${raw}`))
      .then(bytes => cryptoImpl.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']));
  }

  async seal(value, context) {
    const plaintext = String(value || '');
    const aad = String(context || '');
    if (plaintext.length < 20 || plaintext.length > 4096 || !aad || aad.length > 512 || /[\r\n\u0000]/.test(aad)) fail();
    const nonce = new Uint8Array(12);
    this.crypto.getRandomValues(nonce);
    try {
      const ciphertext = await this.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(aad), tagLength: 128 },
        await this.key,
        encoder.encode(plaintext)
      );
      return `v1.${bytesToBase64Url(nonce)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
    } catch { fail(); }
  }

  async open(value, context) {
    const raw = String(value || '');
    const aad = String(context || '');
    const parts = raw.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1' || !aad || aad.length > 512) fail();
    let nonce;
    let ciphertext;
    try {
      nonce = base64UrlToBytes(parts[1], 12);
      ciphertext = base64UrlToBytes(parts[2], 8192);
    } catch { fail(); }
    if (nonce.length !== 12 || ciphertext.length < 36) fail();
    try {
      const plaintext = await this.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(aad), tagLength: 128 },
        await this.key,
        ciphertext
      );
      const decoded = decoder.decode(plaintext);
      if (decoded.length < 20 || decoded.length > 4096 || /[\r\n\u0000]/.test(decoded)) fail();
      return decoded;
    } catch { fail(); }
  }
}
