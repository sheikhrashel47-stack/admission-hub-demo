import { AuthServiceBoundary } from './service-base.mjs';
import { validateSignInInput, validateSignUpInput, assertAuthenticationResult } from '../core/validation.mjs';

export class AuthService extends AuthServiceBoundary {
  constructor(port) { super('auth', port); }
  async signIn(input, context) { return assertAuthenticationResult(await this.invoke('authenticate', validateSignInInput(input), context)); }
  async signUp(input, context) { return assertAuthenticationResult(await this.invoke('signUp', validateSignUpInput(input), context)); }
}
