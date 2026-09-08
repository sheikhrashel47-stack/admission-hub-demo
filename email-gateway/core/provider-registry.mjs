import {
  PROVIDER_CAPABILITIES,
  PROVIDER_HEALTH,
  ROUTER_MODES
} from './constants.mjs';
import { stableNumber } from './crypto.mjs';
import { deriveQuotaState } from './quota.mjs';
import { assertProviderAdapter } from '../providers/base-provider.mjs';
import { EmailGatewayError } from './errors.mjs';
import { EMAIL_FAILURE_CODES } from './constants.mjs';

const REQUIRED_CAPABILITIES = [PROVIDER_CAPABILITIES.TRANSACTIONAL, PROVIDER_CAPABILITIES.HTML, PROVIDER_CAPABILITIES.TEXT];

export class ProviderRegistry {
  constructor({ entries, healthMonitor, config }) {
    this.healthMonitor = healthMonitor;
    this.config = config;
    this.entries = new Map();
    this.remoteHealthCache = new Map();
    for (const entry of entries) {
      if (this.entries.has(entry.id)) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION, safeMessage: `Duplicate email provider: ${entry.id}` });
      assertProviderAdapter(entry.adapter);
      if (entry.adapter.id !== entry.id || !entry.policy || !Array.isArray(entry.policy.capabilities)) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION, safeMessage: `Email provider entry is invalid: ${entry.id}` });
      this.entries.set(entry.id, entry);
    }
  }

  get(id) {
    return this.entries.get(id) || null;
  }

  all() {
    return [...this.entries.values()];
  }

  async remoteHealth(entry, { refresh = false } = {}) {
    if (!entry.enabled || !entry.requiresRemoteHealth) return Object.freeze({ status: 'NOT_RUN', remoteVerified: false });
    const now = Date.now();
    const cached = this.remoteHealthCache.get(entry.id);
    if (!refresh && cached?.expiresAt > now) return cached.value || cached.promise;
    const promise = Promise.resolve(entry.adapter.checkHealth()).then(result => Object.freeze({
      status: String(result?.status || 'DEGRADED'),
      remoteVerified: result?.remoteVerified === true,
      ...(typeof result?.senderVerified === 'boolean' ? { senderVerified: result.senderVerified } : {}),
      ...(typeof result?.transactionalReady === 'boolean' ? { transactionalReady: result.transactionalReady } : {})
    })).catch(error => Object.freeze({ status: 'OFFLINE', remoteVerified: false, code: String(error?.code || EMAIL_FAILURE_CODES.UNKNOWN) }));
    this.remoteHealthCache.set(entry.id, { promise, expiresAt: now + 60000 });
    const value = await promise;
    this.remoteHealthCache.set(entry.id, { value, expiresAt: now + 60000 });
    return value;
  }

  async status({ refreshRemote = false } = {}) {
    const entries = this.all();
    const primaryPriority = Math.min(...entries.filter(entry => entry.enabled && !entry.policy.emergency).map(entry => entry.policy.priority), Number.POSITIVE_INFINITY);
    return Promise.all(entries.map(async entry => {
      const [snapshot, remote] = await Promise.all([
        this.healthMonitor.snapshot(entry),
        this.remoteHealth(entry, { refresh: refreshRemote })
      ]);
      const successCount = Number(snapshot.state.successCount || 0);
      const failureCount = Number(snapshot.state.failureCount || 0);
      const timeoutCount = Number(snapshot.state.timeoutCount || 0);
      const total = successCount + failureCount;
      const maxConcurrent = Math.max(1, Number(entry.policy.maxConcurrent || 20));
      const currentLoad = Math.max(0, Number(snapshot.state.currentInFlight || 0));
      const health = remote.status === 'OFFLINE'
        ? PROVIDER_HEALTH.OFFLINE
        : (remote.senderVerified === false || remote.transactionalReady === false || remote.status === 'INELIGIBLE')
            ? PROVIDER_HEALTH.DEGRADED
            : (remote.status === 'HEALTHY' && remote.remoteVerified && total === 0)
                ? PROVIDER_HEALTH.HEALTHY
                : snapshot.health;
      return Object.freeze({
        id: entry.id,
        name: entry.name,
        enabled: entry.enabled,
        configured: entry.configured,
        activationIssues: entry.activationIssues,
        priority: entry.policy.priority,
        weight: entry.policy.weight,
        emergency: entry.policy.emergency,
        failover: !entry.enabled ? 'SKIPPED' : entry.policy.emergency ? 'EMERGENCY' : entry.policy.priority === primaryPriority ? 'PRIMARY' : 'ELIGIBLE',
        capabilities: entry.policy.capabilities,
        health,
        remoteHealth: remote,
        circuit: snapshot.state.circuit,
        successCount,
        failureCount,
        timeoutCount,
        successRate: total ? successCount / total : 0,
        failureRate: total ? failureCount / total : 0,
        timeoutRate: total ? timeoutCount / total : 0,
        latencyMs: Number(snapshot.state.latencyEwmaMs || 0),
        currentLoad,
        maxConcurrent,
        loadRatio: Math.min(1, currentLoad / maxConcurrent),
        lastSuccess: snapshot.state.lastSuccess,
        lastFailure: snapshot.state.lastFailure,
        cooldownUntil: snapshot.state.cooldownUntil,
        quotaState: deriveQuotaState(snapshot.quota, this.config.quota),
        quota: snapshot.quota
      });
    }));
  }

  async candidates({ requestId, emergency = false, excluded = new Set() }) {
    const eligible = this.all().filter(entry =>
      entry.enabled &&
      Boolean(entry.policy.emergency) === emergency &&
      !excluded.has(entry.id) &&
      REQUIRED_CAPABILITIES.every(capability => entry.policy.capabilities.includes(capability))
    );
    const rows = await Promise.all(eligible.map(async entry => {
      const [snapshot, remote] = await Promise.all([this.healthMonitor.snapshot(entry), this.remoteHealth(entry)]);
      return { entry, snapshot, remote };
    }));
    const available = rows.filter(row =>
      ![PROVIDER_HEALTH.DISABLED, PROVIDER_HEALTH.OFFLINE, PROVIDER_HEALTH.QUOTA_EXHAUSTED].includes(row.snapshot.health) &&
      !['OFFLINE', 'INELIGIBLE', 'DISABLED'].includes(row.remote.status) &&
      row.remote.senderVerified !== false &&
      row.remote.transactionalReady !== false
    );
    const mode = this.config.router.mode;
    const weighted = row => {
      const unit = ((stableNumber(`${requestId}:${row.entry.id}`) % 1000000) + 1) / 1000001;
      return -Math.log(unit) / Math.max(0.001, Number(row.entry.policy.weight ?? 1));
    };
    const quotaRatio = row => Number.isFinite(row.snapshot.quota.remainingRatio) ? row.snapshot.quota.remainingRatio : 1;
    const hybrid = row => {
      const healthPenalty = row.snapshot.health === PROVIDER_HEALTH.DEGRADED ? 150 : row.snapshot.health === PROVIDER_HEALTH.RATE_LIMITED ? 350 : row.snapshot.health === PROVIDER_HEALTH.QUOTA_LOW ? 220 : 0;
      const quotaPenalty = (1 - quotaRatio(row)) * 200;
      const latencyPenalty = Number(row.snapshot.state.latencyEwmaMs || 0) / 20;
      const total = Number(row.snapshot.state.successCount || 0) + Number(row.snapshot.state.failureCount || 0);
      const failurePenalty = total ? (Number(row.snapshot.state.failureCount || 0) / total) * 250 : 40;
      const timeoutPenalty = total ? (Number(row.snapshot.state.timeoutCount || 0) / total) * 400 : 0;
      const loadPenalty = (Number(row.snapshot.state.currentInFlight || 0) / Math.max(1, Number(row.entry.policy.maxConcurrent || 20))) * 300;
      const remotePenalty = row.remote.status === 'DEGRADED' ? 100 : row.remote.remoteVerified === false && row.entry.requiresRemoteHealth ? 150 : 0;
      const costPenalty = Number(row.entry.policy.costWeight ?? 1) * 10;
      const weightBonus = Math.min(50, Number(row.entry.policy.weight ?? 1) * 5);
      return row.entry.policy.priority + healthPenalty + quotaPenalty + latencyPenalty + failurePenalty + timeoutPenalty + loadPenalty + remotePenalty + costPenalty - weightBonus + (weighted(row) / 1000000);
    };
    available.sort((left, right) => {
      if (mode === ROUTER_MODES.WEIGHTED) return (hybrid(left) + weighted(left) * 50) - (hybrid(right) + weighted(right) * 50);
      if (mode === ROUTER_MODES.QUOTA) return (hybrid(left) + (1 - quotaRatio(left)) * 500) - (hybrid(right) + (1 - quotaRatio(right)) * 500);
      if (mode === ROUTER_MODES.HYBRID) return hybrid(left) - hybrid(right);
      const priorityAware = row => Number(row.entry.policy.priority) + (hybrid(row) - Number(row.entry.policy.priority)) * 0.001;
      return priorityAware(left) - priorityAware(right);
    });
    return available.map(row => row.entry);
  }
}
