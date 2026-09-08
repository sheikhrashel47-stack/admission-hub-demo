import { BrevoProvider } from './brevo.mjs';
import { ResendProvider } from './resend.mjs';
import { MailjetProvider } from './mailjet.mjs';
import { MailtrapProvider } from './mailtrap.mjs';
import { MailerSendProvider } from './mailersend.mjs';
import { SendPulseProvider } from './sendpulse.mjs';
import { EmailOctopusProvider } from './emailoctopus.mjs';
import { CourierProvider } from './courier.mjs';
import { PROVIDER_CAPABILITIES } from '../core/constants.mjs';

export const PROVIDER_CATALOG = Object.freeze([
  Object.freeze({ id: 'resend', name: 'Resend', priority: 10, secretBindings: Object.freeze(['RESEND_API_KEY']), senderVerificationBinding: 'RESEND_SENDER_VERIFIED' }),
  Object.freeze({ id: 'brevo', name: 'Brevo', priority: 20, secretBindings: Object.freeze(['BREVO_API_KEY']), senderVerificationBinding: 'BREVO_SENDER_VERIFIED' }),
  Object.freeze({ id: 'mailjet', name: 'Mailjet', priority: 30, secretBindings: Object.freeze(['MAILJET_API_KEY', 'MAILJET_SECRET_KEY']), senderVerificationBinding: 'MAILJET_SENDER_VERIFIED' }),
  Object.freeze({ id: 'mailtrap', name: 'Mailtrap', priority: 40, secretBindings: Object.freeze(['MAILTRAP_API_KEY']), senderVerificationBinding: 'MAILTRAP_SENDER_VERIFIED' }),
  Object.freeze({ id: 'mailersend', name: 'MailerSend', priority: 50, secretBindings: Object.freeze(['MAILERSEND_API_KEY']), senderVerificationBinding: 'MAILERSEND_SENDER_VERIFIED' }),
  Object.freeze({ id: 'sendpulse', name: 'SendPulse', priority: 60, secretBindings: Object.freeze(['SENDPULSE_API_KEY']), senderVerificationBinding: 'SENDPULSE_SENDER_VERIFIED' }),
  Object.freeze({ id: 'emailoctopus', name: 'EmailOctopus', priority: 70, secretBindings: Object.freeze(['EMAILOCTOPUS_API_KEY']), senderVerificationBinding: 'EMAILOCTOPUS_SENDER_VERIFIED' }),
  Object.freeze({ id: 'courier', name: 'Courier', priority: 80, secretBindings: Object.freeze(['COURIER_API_KEY']), senderVerificationBinding: 'COURIER_SENDER_VERIFIED' })
]);

const createAdapter = (id, env, runtime) => {
  const common = {
    fromAddress: env.EMAIL_FROM_ADDRESS || runtime.fromAddress,
    fromName: env.EMAIL_FROM_NAME || runtime.fromName || 'Admission Hub',
    fetchImpl: runtime.fetchImpl
  };
  if (id === 'resend') return new ResendProvider({ ...common, apiKey: env.RESEND_API_KEY });
  if (id === 'brevo') return new BrevoProvider({ ...common, apiKey: env.BREVO_API_KEY });
  if (id === 'mailjet') return new MailjetProvider({ ...common, apiKey: env.MAILJET_API_KEY, secretKey: env.MAILJET_SECRET_KEY, apiBase: env.MAILJET_API_BASE });
  if (id === 'mailtrap') return new MailtrapProvider({ ...common, apiKey: env.MAILTRAP_API_KEY });
  if (id === 'mailersend') return new MailerSendProvider({ ...common, apiKey: env.MAILERSEND_API_KEY });
  if (id === 'sendpulse') return new SendPulseProvider({ ...common, apiKey: env.SENDPULSE_API_KEY });
  if (id === 'emailoctopus') return new EmailOctopusProvider({ apiKey: env.EMAILOCTOPUS_API_KEY, fetchImpl: runtime.fetchImpl });
  if (id === 'courier') return new CourierProvider({ ...common, apiKey: env.COURIER_API_KEY });
  return null;
};

export async function createProviderEntries({ env = {}, config, runtime = {} }) {
  const globalActivation = env.EMAIL_PROVIDER_ACTIVATION === 'enabled' || runtime.allowProviderActivation === true;
  const senderAddress = String(env.EMAIL_FROM_ADDRESS || runtime.fromAddress || '');
  const senderName = String(env.EMAIL_FROM_NAME || runtime.fromName || 'Admission Hub');
  const senderAddressValid = senderAddress.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,63}$/.test(senderAddress);
  const senderNameValid = senderName.length > 0 && senderName.length <= 100 && !/[\r\n\u0000<>]/.test(senderName);
  const entries = [];

  for (const catalog of PROVIDER_CATALOG) {
    const policy = config.providerPolicies[catalog.id] || {};
    const adapter = createAdapter(catalog.id, env, runtime);
    const verification = await adapter.verifyConfiguration();
    const explicitEnabled = policy.enabled === true;
    const quotaBounded = Number(policy.dailyLimit || 0) > 0 || Number(policy.monthlyLimit || 0) > 0;
    const emergency = policy.emergency ?? false;
    const transactional = adapter.getCapabilities().includes(PROVIDER_CAPABILITIES.TRANSACTIONAL);
    const providerSenderVerified = senderAddressValid && senderNameValid && (
      env[catalog.senderVerificationBinding] === 'true' ||
      runtime.providerSenderVerified?.[catalog.id] === true ||
      runtime.senderVerified === true
    );
    const enabled = Boolean(explicitEnabled && globalActivation && providerSenderVerified && quotaBounded && verification.configured && transactional);
    const issues = [
      !explicitEnabled && 'POLICY_DISABLED',
      explicitEnabled && !globalActivation && 'ACTIVATION_GATE_CLOSED',
      explicitEnabled && !providerSenderVerified && 'SENDER_NOT_VERIFIED',
      explicitEnabled && !quotaBounded && 'QUOTA_POLICY_MISSING',
      explicitEnabled && !verification.configured && 'CREDENTIALS_OR_SENDER_MISSING',
      explicitEnabled && !transactional && 'TRANSACTIONAL_CAPABILITY_MISSING'
    ].filter(Boolean);

    entries.push(Object.freeze({
      id: catalog.id,
      name: catalog.name,
      adapter,
      enabled,
      configured: verification.configured,
      requiresRemoteHealth: transactional,
      activationIssues: Object.freeze(issues),
      policy: Object.freeze({
        priority: Number(policy.priority || catalog.priority),
        weight: Number(policy.weight ?? 1),
        dailyLimit: Number(policy.dailyLimit || 0),
        monthlyLimit: Number(policy.monthlyLimit || 0),
        timeoutMs: Number(policy.timeoutMs || config.router.defaultProviderTimeoutMs),
        maxConcurrent: Number(policy.maxConcurrent || 20),
        emergency,
        costWeight: Number(policy.costWeight ?? 1),
        capabilities: Object.freeze(policy.capabilities ? adapter.getCapabilities().filter(value => policy.capabilities.includes(value)) : [...adapter.getCapabilities()])
      })
    }));
  }
  return Object.freeze(entries);
}
