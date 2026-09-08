import { EmailGatewayError } from './errors.mjs';
import { EMAIL_FAILURE_CODES } from './constants.mjs';

export class EmailRateLimiter {
  constructor({ store, config, now = () => Date.now() }) {
    this.store = store;
    this.config = config;
    this.now = now;
  }

  async consume({ recipientRef, ipRef, accountRef, deviceRef, type }) {
    if (!this.config.rateLimits.enabled) return Object.freeze({ allowed: true, checks: [] });
    const rules = [
      [`recipient:${recipientRef}:${type}:short`, this.config.rateLimits.recipientWindow],
      [`recipient:${recipientRef}:${type}:day`, this.config.rateLimits.recipientDay],
      [`global:${type}`, this.config.rateLimits.globalWindow]
    ];
    if (ipRef) rules.push([`ip:${ipRef}:${type}`, this.config.rateLimits.ipWindow]);
    if (accountRef) rules.push([`account:${accountRef}:${type}`, this.config.rateLimits.accountWindow]);
    if (deviceRef) rules.push([`device:${deviceRef}:${type}`, this.config.rateLimits.deviceWindow]);
    const now = this.now();
    const checks = await Promise.all(rules.map(([key, rule]) => this.store.consumeRateLimit(key, rule.limit, rule.windowMs, now)));
    const blocked = checks.find(check => !check.allowed);
    if (blocked) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.RATE_LIMITED, retryable: false, status: 429 });
    return Object.freeze({ allowed: true, checks: Object.freeze(checks.map(check => Object.freeze({ ...check }))) });
  }
}
