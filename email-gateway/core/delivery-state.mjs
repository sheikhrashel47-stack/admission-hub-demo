import { DELIVERY_STATES } from './constants.mjs';

const DELIVERY_RANK = Object.freeze({
  [DELIVERY_STATES.ACCEPTED]: 1,
  [DELIVERY_STATES.QUEUED]: 2,
  [DELIVERY_STATES.SENT]: 3,
  [DELIVERY_STATES.DELIVERED]: 4
});

const ADVERSE_DELIVERY_STATES = new Set([
  DELIVERY_STATES.BOUNCED,
  DELIVERY_STATES.REJECTED,
  DELIVERY_STATES.COMPLAINED
]);

export function shouldApplyDeliveryTransition(current, next) {
  if (!current || !next) return false;
  if (Number(next.updatedAt || 0) < Number(current.updatedAt || 0)) return false;
  if (ADVERSE_DELIVERY_STATES.has(current.status)) return false;
  if (ADVERSE_DELIVERY_STATES.has(next.status)) return true;
  return (DELIVERY_RANK[next.status] || 0) > (DELIVERY_RANK[current.status] || 0);
}
