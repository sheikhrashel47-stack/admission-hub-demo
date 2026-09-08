import { QUOTA_STATES } from './constants.mjs';

const periodKeys = now => {
  const iso = new Date(now).toISOString();
  return { day: iso.slice(0, 10), month: iso.slice(0, 7) };
};

export const createQuotaState = providerId => ({
  providerId,
  day: '',
  dayCount: 0,
  month: '',
  monthCount: 0,
  lastReservedAt: null
});

export function reserveQuotaState(current, { providerId, dailyLimit = 0, monthlyLimit = 0, now = Date.now() }) {
  const keys = periodKeys(now);
  const state = { ...createQuotaState(providerId), ...(current || {}), providerId };
  if (state.day !== keys.day) {
    state.day = keys.day;
    state.dayCount = 0;
  }
  if (state.month !== keys.month) {
    state.month = keys.month;
    state.monthCount = 0;
  }
  const daily = Math.max(0, Number(dailyLimit || 0));
  const monthly = Math.max(0, Number(monthlyLimit || 0));
  if ((daily && state.dayCount >= daily) || (monthly && state.monthCount >= monthly)) {
    return { allowed: false, state, ...quotaSnapshot(state, { dailyLimit: daily, monthlyLimit: monthly }) };
  }
  state.dayCount += 1;
  state.monthCount += 1;
  state.lastReservedAt = now;
  return { allowed: true, state, ...quotaSnapshot(state, { dailyLimit: daily, monthlyLimit: monthly }) };
}

export function deriveQuotaState(quota, policy = {}) {
  if (quota?.exhausted) return QUOTA_STATES.EXHAUSTED;
  if (!Number.isFinite(quota?.remainingRatio)) return QUOTA_STATES.UNKNOWN;
  if (quota.remainingRatio <= Number(policy.reduceRatio ?? 0.10)) return QUOTA_STATES.CRITICAL;
  if (quota.remainingRatio <= Number(policy.warningRatio ?? 0.30)) return QUOTA_STATES.LOW;
  return QUOTA_STATES.NORMAL;
}

export function quotaSnapshot(current, { dailyLimit = 0, monthlyLimit = 0 } = {}) {
  const state = current || createQuotaState('');
  const daily = Math.max(0, Number(dailyLimit || 0));
  const monthly = Math.max(0, Number(monthlyLimit || 0));
  const dailyRemaining = daily ? Math.max(0, daily - Number(state.dayCount || 0)) : null;
  const monthlyRemaining = monthly ? Math.max(0, monthly - Number(state.monthCount || 0)) : null;
  const ratios = [
    daily ? dailyRemaining / daily : null,
    monthly ? monthlyRemaining / monthly : null
  ].filter(Number.isFinite);
  return {
    localEstimate: true,
    dayCount: Number(state.dayCount || 0),
    monthCount: Number(state.monthCount || 0),
    dailyRemaining,
    monthlyRemaining,
    remainingRatio: ratios.length ? Math.min(...ratios) : null,
    exhausted: (dailyRemaining === 0) || (monthlyRemaining === 0)
  };
}
