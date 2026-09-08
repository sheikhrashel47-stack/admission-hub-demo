import { createEmailGatewayConfig } from './core/config.mjs';
import { assertEmailStore } from './storage/contracts.mjs';
import { MemoryEmailStore } from './storage/memory-store.mjs';
import { createProviderEntries } from './providers/catalog.mjs';
import { ProviderHealthMonitor } from './core/health-monitor.mjs';
import { ProviderQuotaEngine } from './core/quota-engine.mjs';
import { ProviderRegistry } from './core/provider-registry.mjs';
import { EmailObservability } from './core/observability.mjs';
import { EmailTemplateEngine } from './core/template-engine.mjs';
import { EmailRateLimiter } from './core/rate-limiter.mjs';
import { EmailRouter } from './core/router.mjs';
import { EmailGateway } from './core/email-gateway.mjs';

const bind = (target, names) => Object.freeze(Object.fromEntries(names.map(name => [name, target[name].bind(target)])));

export async function createEmailGateway({ config: configOverrides = {}, store, entries, env = {}, privatePepper = '', runtime = {} } = {}) {
  const config = createEmailGatewayConfig(configOverrides);
  const now = runtime.now || (() => Date.now());
  if (!store && config.environment === 'production') throw new TypeError('A durable Email Gateway store is required in production.');
  if (entries && config.environment === 'production' && runtime.allowCustomProviderEntries !== true) throw new TypeError('Custom provider entries are forbidden in production composition.');
  const selectedStore = assertEmailStore(store || new MemoryEmailStore({ now, eventRetention: config.observability.eventRetention }));
  const providerEntries = entries || await createProviderEntries({ env, config, runtime: { ...runtime, now } });
  const healthMonitor = new ProviderHealthMonitor({ store: selectedStore, config, now });
  const quotaEngine = new ProviderQuotaEngine({ store: selectedStore, now });
  const registry = new ProviderRegistry({ entries: providerEntries, healthMonitor, config });
  const observability = new EmailObservability({ store: selectedStore, config, now, randomId: runtime.randomId, onEvent: runtime.onEvent, onAlert: runtime.onAlert });
  const templateEngine = new EmailTemplateEngine({ config });
  const rateLimiter = new EmailRateLimiter({ store: selectedStore, config, now });
  const router = new EmailRouter({ registry, healthMonitor, quotaEngine, observability, config, now, setTimer: runtime.setTimer, clearTimer: runtime.clearTimer });
  const gateway = new EmailGateway({ config, store: selectedStore, registry, router, templateEngine, rateLimiter, observability, privatePepper, now, hashReference: runtime.hashReference });
  return bind(gateway, ['send', 'healthCheck', 'getCapabilities', 'recordDeliveryEvent']);
}

export function createEmailGatewayPort(gateway) {
  const methods = ['send', 'healthCheck', 'getCapabilities'];
  if (!gateway || methods.some(method => typeof gateway[method] !== 'function')) throw new TypeError('Email Gateway contract is required.');
  return Object.freeze(Object.fromEntries(methods.map(method => [method, gateway[method].bind(gateway)])));
}
