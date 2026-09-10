import { pathToFileURL } from 'node:url';
import { FirebaseEmailPasswordProvider, FirebaseRequestError } from '../providers/firebase-auth.mjs';

const CONTINUE_URL = 'https://admissionhub.pages.dev/?firebaseVerified=1';

export class GoogleReadinessError extends Error {
  constructor(code = 'GOOGLE_READINESS_FAILED', status = 0) {
    super(code);
    this.name = 'GoogleReadinessError';
    this.code = String(code || 'GOOGLE_READINESS_FAILED').toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 80);
    this.status = Number(status || 0);
  }
}

const asReadinessError = cause => cause instanceof GoogleReadinessError
  ? cause
  : cause instanceof FirebaseRequestError
    ? new GoogleReadinessError(cause.reason || 'FIREBASE_REJECTED', cause.status)
    : new GoogleReadinessError();

export async function verifyGoogleReadiness({ apiKey, fetchImpl = globalThis.fetch } = {}) {
  const provider = new FirebaseEmailPasswordProvider({ apiKey, continueUrl: CONTINUE_URL, fetchImpl });
  if (!provider.configured) throw new GoogleReadinessError('API_KEY_MISSING');
  try {
    const project = await provider.inspectProject();
    if (!project.projectIdentified) throw new GoogleReadinessError('PROJECT_NOT_IDENTIFIED');
    if (!project.continueDomainAuthorized) throw new GoogleReadinessError('PAGES_DOMAIN_NOT_AUTHORIZED');
    let source = 'project-config';
    if (project.google?.enabled !== true || !project.google.clientId) {
      const discovered = await provider.inspectGoogleProvider();
      if (discovered.available !== true || !discovered.clientId) throw new GoogleReadinessError('GOOGLE_PROVIDER_NOT_READY');
      source = 'firebase-auth-uri';
    }
    const auditSessionId = `readiness-${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const redirect = await provider.inspectGoogleRedirectFlow(auditSessionId);
    if (
      redirect.available !== true ||
      redirect.sessionBound !== true ||
      redirect.responseMode !== 'code' ||
      redirect.authorizationRequestAccepted !== true
    ) throw new GoogleReadinessError('GOOGLE_REDIRECT_FLOW_NOT_READY');
    return Object.freeze({
      ready: true,
      provider: 'google.com',
      clientIdValidated: true,
      source,
      redirectSessionBound: true,
      redirectResponseMode: 'code',
      redirectCallbackKind: redirect.callbackKind,
      authorizationRequestAccepted: true
    });
  } catch (cause) {
    throw asReadinessError(cause);
  }
}

async function main({ env = process.env, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await verifyGoogleReadiness({ apiKey: env.FIREBASE_WEB_API_KEY });
    stdout.write(`GOOGLE_AUTH_READINESS status=READY provider=${result.provider} clientIdValidated=${result.clientIdValidated} source=${result.source} redirectSessionBound=${result.redirectSessionBound} redirectResponseMode=${result.redirectResponseMode} redirectCallbackKind=${result.redirectCallbackKind} authorizationRequestAccepted=${result.authorizationRequestAccepted} clientIdPrinted=false keyPrinted=false credentialPrinted=false authorizationUrlPrinted=false\n`);
  } catch (cause) {
    const safe = asReadinessError(cause);
    stderr.write(`::error title=Google Auth readiness check failed::code=${safe.code} status=${safe.status} credentialPrinted=false\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
