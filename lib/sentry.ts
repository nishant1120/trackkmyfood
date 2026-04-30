// Sentry init. Opt-in via EXPO_PUBLIC_SENTRY_DSN — when missing we no-op
// so dev / self-hosters never need an account. Safe to call multiple times;
// init is idempotent within a single process.

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!DSN) return; // opt-in
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    debug: false,
    enableNative: true,
  });
  initialized = true;
}

// Lightweight error reporter callers can use without importing the SDK.
export function reportError(err: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(err, { extra: context });
}
