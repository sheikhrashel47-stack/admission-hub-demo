export { createEmailGateway, createEmailGatewayPort } from './create-email-gateway.mjs';
export { createEmailGatewayServiceClient } from './service-client.mjs';
export {
  EMAIL_GATEWAY_VERSION,
  EMAIL_TYPES,
  EMAIL_PRIORITIES,
  ROUTER_MODES,
  PROVIDER_IDS,
  PROVIDER_CAPABILITIES,
  EMAIL_FAILURE_CODES,
  CIRCUIT_STATES,
  PROVIDER_HEALTH,
  DELIVERY_STATES
} from './core/constants.mjs';
export { EmailGatewayError, toPublicEmailError } from './core/errors.mjs';
