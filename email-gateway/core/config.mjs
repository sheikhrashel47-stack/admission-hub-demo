import {
  PROVIDER_IDS,
  PROVIDER_CAPABILITIES,
  ROUTER_MODES
} from './constants.mjs';
import { EmailGatewayError } from './errors.mjs';
import { EMAIL_FAILURE_CODES } from './constants.mjs';

const DEFAULTS = {
  environment: 'production',
  router: {
    mode: ROUTER_MODES.HYBRID,
    maxProviderAttempts: 3,
    globalDeadlineMs: 12000,
    defaultProviderTimeoutMs: 4500,
    emergencyMaxAttempts: 1
  },
  circuit: {
    failureThreshold: 3,
    cooldownMs: 60000,
    degradedFailureRate: 0.25,
    degradedLatencyMs: 2500
  },
  quota: {
    warningRatio: 0.30,
    reduceRatio: 0.10,
    backupRatio: 0.05
  },
  rateLimits: {
    enabled: true,
    recipientWindow: { limit: 3, windowMs: 15 * 60 * 1000 },
    recipientDay: { limit: 8, windowMs: 24 * 60 * 60 * 1000 },
    ipWindow: { limit: 20, windowMs: 15 * 60 * 1000 },
    accountWindow: { limit: 10, windowMs: 15 * 60 * 1000 },
    deviceWindow: { limit: 10, windowMs: 15 * 60 * 1000 },
    globalWindow: { limit: 500, windowMs: 60 * 1000 }
  },
  idempotency: {
    ttlSeconds: 24 * 60 * 60,
    eventLeaseSeconds: 30
  },
  request: {
    maxBodyBytes: 24 * 1024,
    maxSubjectLength: 180,
    maxVariableCount: 30,
    maxVariableValueLength: 4000
  },
  security: {
    signatureMaxAgeSeconds: 90,
    nonceTtlSeconds: 5 * 60,
    deliveryEventFutureSkewSeconds: 5 * 60,
    requireStrongConsistency: true
  },
  otp: {
    digits: 6,
    expiryMinutes: 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60
  },
  observability: {
    eventRetention: 200,
    alertFailureThreshold: 5,
    alertCooldownMs: 15 * 60 * 1000
  },
  providerPolicies: {}
};

const POLICY_KEYS = new Set([
  'enabled', 'priority', 'weight', 'dailyLimit', 'monthlyLimit', 'timeoutMs', 'maxConcurrent',
  'emergency', 'costWeight', 'capabilities'
]);
const ROOT_KEYS = new Set(Object.keys(DEFAULTS));
const SECTION_KEYS = Object.freeze(Object.fromEntries(Object.entries(DEFAULTS).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)).map(([key, value]) => [key, new Set(Object.keys(value))])));
const SECRET_KEY = /(api.?key|secret|password|credential|authorization|access.?key|private.?key|token)/i;
const SECRET_VALUE = /^(?:ghp_|github_pat_|sk[-_]|re_|x(?:key|smtp)sib-|SG\.|mlsn\.|sp_apikey_|eo_|pk_[A-Z0-9]{12,}|AIza|AKIA|Bearer\s|eyJ[A-Za-z0-9_-]+\.)/i;

const fail = message => {
  throw new EmailGatewayError({
    code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION,
    safeMessage: message,
    retryable: false,
    status: 500
  });
};

const plainObject = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const assertNoSecretMaterial = (value, path = 'config') => {
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoSecretMaterial(item, `${path}[${index}]`));
  if (!plainObject(value)) {
    if (typeof value === 'string' && SECRET_VALUE.test(value.trim())) fail(`Secret-like value is forbidden in ${path}.`);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) fail(`Secret-like key is forbidden in ${path}.`);
    assertNoSecretMaterial(item, `${path}.${key}`);
  }
};

const clone = value => {
  if (Array.isArray(value)) return value.map(clone);
  if (plainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
};

const merge = (base, overrides) => {
  const output = clone(base);
  for (const [key, value] of Object.entries(overrides || {})) {
    if (plainObject(value) && plainObject(output[key])) output[key] = merge(output[key], value);
    else output[key] = clone(value);
  }
  return output;
};

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

const finiteRange = (value, name, min, max) => {
  if (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) fail(`${name} is outside its safe range.`);
};

const validateWindow = (window, name) => {
  if (!plainObject(window)) fail(`${name} must be an object.`);
  finiteRange(window.limit, `${name}.limit`, 1, 1000000);
  finiteRange(window.windowMs, `${name}.windowMs`, 1000, 31 * 24 * 60 * 60 * 1000);
};

export function createEmailGatewayConfig(overrides = {}) {
  if (!plainObject(overrides)) fail('Email Gateway configuration must be an object.');
  assertNoSecretMaterial(overrides);
  for (const [key, value] of Object.entries(overrides)) {
    if (!ROOT_KEYS.has(key)) fail(`Unknown Email Gateway configuration key: ${key}`);
    if (key !== 'providerPolicies' && plainObject(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (!SECTION_KEYS[key]?.has(nestedKey)) fail(`Unknown Email Gateway configuration key: ${key}.${nestedKey}`);
        if (plainObject(nestedValue) && plainObject(DEFAULTS[key]?.[nestedKey])) {
          for (const deepKey of Object.keys(nestedValue)) if (!(deepKey in DEFAULTS[key][nestedKey])) fail(`Unknown Email Gateway configuration key: ${key}.${nestedKey}.${deepKey}`);
        }
      }
    }
  }
  const config = merge(DEFAULTS, overrides);

  if (!['production', 'test', 'development'].includes(config.environment)) fail('Unsupported Email Gateway environment.');
  if (!Object.values(ROUTER_MODES).includes(config.router.mode)) fail('Unsupported email routing mode.');
  finiteRange(config.router.maxProviderAttempts, 'router.maxProviderAttempts', 1, 11);
  finiteRange(config.router.emergencyMaxAttempts, 'router.emergencyMaxAttempts', 0, 2);
  finiteRange(config.router.globalDeadlineMs, 'router.globalDeadlineMs', 100, 30000);
  finiteRange(config.router.defaultProviderTimeoutMs, 'router.defaultProviderTimeoutMs', 50, 15000);
  finiteRange(config.circuit.failureThreshold, 'circuit.failureThreshold', 1, 20);
  finiteRange(config.circuit.cooldownMs, 'circuit.cooldownMs', 100, 24 * 60 * 60 * 1000);
  finiteRange(config.circuit.degradedFailureRate, 'circuit.degradedFailureRate', 0, 1);
  finiteRange(config.circuit.degradedLatencyMs, 'circuit.degradedLatencyMs', 1, 30000);
  for (const key of ['warningRatio', 'reduceRatio', 'backupRatio']) finiteRange(config.quota[key], `quota.${key}`, 0, 1);
  if (!(config.quota.warningRatio >= config.quota.reduceRatio && config.quota.reduceRatio >= config.quota.backupRatio)) fail('Quota thresholds must descend from warning to backup.');

  if (typeof config.rateLimits.enabled !== 'boolean') fail('rateLimits.enabled must be boolean.');
  if (!config.rateLimits.enabled && config.environment === 'production') fail('Production email rate limits cannot be disabled.');
  for (const name of ['recipientWindow', 'recipientDay', 'ipWindow', 'accountWindow', 'deviceWindow', 'globalWindow']) validateWindow(config.rateLimits[name], `rateLimits.${name}`);

  finiteRange(config.idempotency.ttlSeconds, 'idempotency.ttlSeconds', 60, 7 * 24 * 60 * 60);
  finiteRange(config.idempotency.eventLeaseSeconds, 'idempotency.eventLeaseSeconds', 5, 300);
  finiteRange(config.request.maxBodyBytes, 'request.maxBodyBytes', 1024, 256 * 1024);
  finiteRange(config.request.maxSubjectLength, 'request.maxSubjectLength', 10, 500);
  finiteRange(config.request.maxVariableCount, 'request.maxVariableCount', 1, 100);
  finiteRange(config.request.maxVariableValueLength, 'request.maxVariableValueLength', 10, 10000);
  finiteRange(config.security.signatureMaxAgeSeconds, 'security.signatureMaxAgeSeconds', 10, 600);
  finiteRange(config.security.nonceTtlSeconds, 'security.nonceTtlSeconds', config.security.signatureMaxAgeSeconds, 3600);
  finiteRange(config.security.deliveryEventFutureSkewSeconds, 'security.deliveryEventFutureSkewSeconds', 0, 3600);
  if (typeof config.security.requireStrongConsistency !== 'boolean') fail('security.requireStrongConsistency must be boolean.');
  finiteRange(config.otp.digits, 'otp.digits', 6, 8);
  finiteRange(config.otp.expiryMinutes, 'otp.expiryMinutes', 1, 30);
  finiteRange(config.otp.maxAttempts, 'otp.maxAttempts', 1, 10);
  finiteRange(config.otp.resendCooldownSeconds, 'otp.resendCooldownSeconds', 30, 900);
  finiteRange(config.observability.eventRetention, 'observability.eventRetention', 10, 500);
  finiteRange(config.observability.alertFailureThreshold, 'observability.alertFailureThreshold', 1, 100);
  finiteRange(config.observability.alertCooldownMs, 'observability.alertCooldownMs', 1000, 24 * 60 * 60 * 1000);

  if (!plainObject(config.providerPolicies)) fail('providerPolicies must be an object.');
  for (const [providerId, policy] of Object.entries(config.providerPolicies)) {
    if (!PROVIDER_IDS.includes(providerId)) fail(`Unknown email provider: ${providerId}`);
    if (!plainObject(policy)) fail(`Provider policy must be an object: ${providerId}`);
    for (const key of Object.keys(policy)) {
      if (!POLICY_KEYS.has(key) || SECRET_KEY.test(key)) fail(`Unsafe provider policy key for ${providerId}: ${key}`);
    }
    if (typeof policy.enabled !== 'boolean') fail(`${providerId}.enabled must be explicit.`);
    finiteRange(policy.priority ?? 100, `${providerId}.priority`, 1, 1000);
    finiteRange(policy.weight ?? 1, `${providerId}.weight`, 0.001, 1000);
    finiteRange(policy.timeoutMs ?? config.router.defaultProviderTimeoutMs, `${providerId}.timeoutMs`, 50, 15000);
    finiteRange(policy.maxConcurrent ?? 20, `${providerId}.maxConcurrent`, 1, 10000);
    if (!Number.isInteger(Number(policy.maxConcurrent ?? 20))) fail(`${providerId}.maxConcurrent must be an integer.`);
    finiteRange(policy.dailyLimit ?? 0, `${providerId}.dailyLimit`, 0, 1000000000);
    finiteRange(policy.monthlyLimit ?? 0, `${providerId}.monthlyLimit`, 0, 1000000000);
    finiteRange(policy.costWeight ?? 1, `${providerId}.costWeight`, 0, 1000);
    if (typeof (policy.emergency ?? false) !== 'boolean') fail(`${providerId}.emergency must be boolean.`);
    if (policy.capabilities && (!Array.isArray(policy.capabilities) || policy.capabilities.some(item => typeof item !== 'string' || !Object.values(PROVIDER_CAPABILITIES).includes(item)))) fail(`${providerId}.capabilities must contain known capability names.`);
  }

  return deepFreeze(config);
}

export function safeParseEmailGatewayConfig(raw) {
  if (raw == null || String(raw).trim() === '') return createEmailGatewayConfig();
  try {
    return createEmailGatewayConfig(JSON.parse(String(raw)));
  } catch (error) {
    if (error instanceof EmailGatewayError) throw error;
    fail('EMAIL_GATEWAY_CONFIG is not valid JSON.');
  }
}
