import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { safeParseEmailGatewayConfig } from '../core/config.mjs';
import { REQUIRED_EMAIL_GATEWAY_BINDINGS } from './inventory-cloudflare-bindings.mjs';

const PROVIDER_PREFIXES = Object.freeze([
  'RESEND', 'BREVO', 'MAILJET', 'MAILTRAP', 'MAILERSEND', 'SENDPULSE', 'COURIER'
]);
const MAX_SECRET_LENGTH = 32 * 1024;
const MAX_PAYLOAD_BYTES = 256 * 1024;
const emailAddress = value => value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,63}$/.test(value);
const senderName = value => value.length > 0 && value.length <= 100 && !/[\r\n\u0000<>]/.test(value);

const namedError = (message, names = []) => {
  const suffix = names.length ? `: ${[...names].sort().join(', ')}` : '';
  return new Error(`${message}${suffix}`);
};

export function collectInfisicalWorkerSecrets(env = {}) {
  const missing = REQUIRED_EMAIL_GATEWAY_BINDINGS.filter(name => typeof env[name] !== 'string' || env[name].trim() === '');
  if (missing.length) throw namedError('Missing required Infisical binding names', missing);

  const oversized = REQUIRED_EMAIL_GATEWAY_BINDINGS.filter(name => Buffer.byteLength(env[name], 'utf8') > MAX_SECRET_LENGTH);
  if (oversized.length) throw namedError('Infisical values exceed the safe size limit for binding names', oversized);

  if (env.EMAIL_PROVIDER_ACTIVATION !== 'disabled') {
    throw new Error('Initial Infisical staging requires EMAIL_PROVIDER_ACTIVATION=disabled.');
  }
  if (env.EMAIL_GATEWAY_SIGNING_SECRET.length < 32 || /[\r\n\u0000]/.test(env.EMAIL_GATEWAY_SIGNING_SECRET)) {
    throw new Error('EMAIL_GATEWAY_SIGNING_SECRET does not meet the staging contract.');
  }
  if (env.EMAIL_RECIPIENT_HASH_PEPPER.length < 32 || /[\r\n\u0000]/.test(env.EMAIL_RECIPIENT_HASH_PEPPER)) {
    throw new Error('EMAIL_RECIPIENT_HASH_PEPPER does not meet the staging contract.');
  }

  for (const prefix of PROVIDER_PREFIXES) {
    if (!emailAddress(env[`${prefix}_FROM_ADDRESS`])) throw new Error(`${prefix}_FROM_ADDRESS is invalid.`);
    if (!senderName(env[`${prefix}_FROM_NAME`])) throw new Error(`${prefix}_FROM_NAME is invalid.`);
    if (!['true', 'false'].includes(env[`${prefix}_SENDER_VERIFIED`])) throw new Error(`${prefix}_SENDER_VERIFIED must be true or false.`);
  }

  const config = safeParseEmailGatewayConfig(env.EMAIL_GATEWAY_CONFIG);
  if (config.environment !== 'production') throw new Error('EMAIL_GATEWAY_CONFIG must target production.');
  if (config.providerPolicies.emailoctopus?.enabled === true) {
    throw new Error('EmailOctopus cannot be enabled for direct transactional OTP.');
  }

  const payload = Object.fromEntries(REQUIRED_EMAIL_GATEWAY_BINDINGS.map(name => [name, env[name]]));
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Infisical Worker secret payload exceeds the safe aggregate size limit.');
  }
  return payload;
}

export async function prepareInfisicalWorkerSecretFile({ env = process.env, outputPath } = {}) {
  if (!outputPath || !isAbsolute(outputPath)) throw new Error('An absolute ephemeral output path is required.');
  const payload = collectInfisicalWorkerSecrets(env);
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  await writeFile(outputPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  return Object.freeze({ bindingCount: Object.keys(payload).length, activation: 'disabled' });
}

async function main({ env = process.env, stdout = process.stdout } = {}) {
  const result = await prepareInfisicalWorkerSecretFile({
    env,
    outputPath: env.EMAIL_GATEWAY_SECRET_BULK_PATH
  });
  stdout.write(`INFISICAL_SECRET_PAYLOAD_PREPARED bindingCount=${result.bindingCount} activation=${result.activation}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`::error title=Infisical staging validation failed::${error.message}\n`);
    process.exitCode = 1;
  });
}
