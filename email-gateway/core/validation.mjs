import {
  DELIVERY_STATES,
  DELIVERY_EVENT_PROVIDER_IDS,
  EMAIL_PRIORITIES,
  EMAIL_TYPES
} from './constants.mjs';
import { EmailGatewayError } from './errors.mjs';
import { EMAIL_FAILURE_CODES } from './constants.mjs';

const EMAIL_PATTERN = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,63}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{15,127}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,159}$/;
const SAFE_TEMPLATE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const fail = message => {
  throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: message, retryable: false, status: 400 });
};

const isPlainObject = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || email.includes('..')) fail('Recipient email is invalid.');
  return email;
}

const normalizeContextValue = value => {
  if (value == null || value === '') return null;
  const output = String(value).trim();
  if (!output || output.length > 180 || CONTROL_CHARS.test(output)) fail('Email request context is invalid.');
  return output;
};

const normalizeVariables = (variables, config) => {
  if (!isPlainObject(variables)) fail('Email template variables must be an object.');
  const entries = Object.entries(variables);
  if (entries.length > config.request.maxVariableCount) fail('Too many email template variables.');
  const output = {};
  for (const [key, raw] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) fail('Email template variable name is invalid.');
    if (['password', 'token', 'secret', 'credential', 'authorization'].includes(key.toLowerCase())) fail('Sensitive credential variables are forbidden.');
    if (!['string', 'number', 'boolean'].includes(typeof raw)) fail('Email template variable value is invalid.');
    const value = String(raw);
    if (value.length > config.request.maxVariableValueLength || CONTROL_CHARS.test(value)) fail('Email template variable is too large or unsafe.');
    output[key] = value;
  }
  return Object.freeze(output);
};

export function normalizeEmailRequest(input, config) {
  if (!isPlainObject(input)) fail('Email request must be an object.');
  const allowed = new Set(['type', 'recipient', 'subject', 'template', 'variables', 'requestId', 'idempotencyKey', 'priority', 'context']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`Unknown email request field: ${key}`);
  if (!Object.values(EMAIL_TYPES).includes(input.type)) fail('Email type is invalid.');
  const recipient = normalizeEmail(input.recipient);
  const requestId = String(input.requestId || '').trim();
  if (!REQUEST_ID_PATTERN.test(requestId)) fail('Email requestId is invalid.');
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  if (!REQUEST_ID_PATTERN.test(idempotencyKey)) fail('Email idempotencyKey is invalid.');
  const priority = input.priority || EMAIL_PRIORITIES.NORMAL;
  if (!Object.values(EMAIL_PRIORITIES).includes(priority)) fail('Email priority is invalid.');
  const template = String(input.template || input.type || '').trim();
  if (!SAFE_TEMPLATE_PATTERN.test(template) || template !== input.type) fail('Email template is invalid.');
  const subject = input.subject == null ? '' : String(input.subject).trim();
  if (subject.length > config.request.maxSubjectLength || /[\r\n]/.test(subject) || CONTROL_CHARS.test(subject)) fail('Email subject is invalid.');
  const context = input.context == null ? {} : input.context;
  if (!isPlainObject(context)) fail('Email context must be an object.');
  const allowedContext = new Set(['ip', 'accountId', 'deviceId']);
  for (const key of Object.keys(context)) if (!allowedContext.has(key)) fail(`Unknown email context field: ${key}`);

  return Object.freeze({
    type: input.type,
    recipient,
    subject,
    template,
    variables: normalizeVariables(input.variables || {}, config),
    requestId,
    idempotencyKey,
    priority,
    context: Object.freeze({
      ip: normalizeContextValue(context.ip),
      accountId: normalizeContextValue(context.accountId),
      deviceId: normalizeContextValue(context.deviceId)
    })
  });
}

export function normalizeDeliveryEvent(input) {
  if (!isPlainObject(input)) fail('Delivery event must be an object.');
  const allowed = new Set(['requestId', 'idempotencyKey', 'providerId', 'providerEventId', 'status', 'occurredAt']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`Unknown delivery event field: ${key}`);
  const requestId = String(input.requestId || '').trim();
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  const providerId = String(input.providerId || '').trim();
  const providerEventId = String(input.providerEventId || '').trim();
  if (!REQUEST_ID_PATTERN.test(requestId)) fail('Delivery event requestId is invalid.');
  if (!REQUEST_ID_PATTERN.test(idempotencyKey)) fail('Delivery event idempotencyKey is invalid.');
  if (!DELIVERY_EVENT_PROVIDER_IDS.includes(providerId)) fail('Delivery event provider is invalid.');
  if (!EVENT_ID_PATTERN.test(providerEventId)) fail('Delivery provider event ID is invalid.');
  if (![DELIVERY_STATES.QUEUED, DELIVERY_STATES.SENT, DELIVERY_STATES.DELIVERED, DELIVERY_STATES.BOUNCED, DELIVERY_STATES.REJECTED, DELIVERY_STATES.COMPLAINED].includes(input.status)) fail('Delivery event status is invalid.');
  const occurredAt = Number(input.occurredAt || Date.now());
  if (!Number.isFinite(occurredAt) || occurredAt < 0) fail('Delivery event time is invalid.');
  return Object.freeze({ requestId, idempotencyKey, providerId, providerEventId, status: input.status, occurredAt });
}
