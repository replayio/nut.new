import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://5465638ce4f73a256d861820b3a4dad4@o437061.ingest.us.sentry.io/4508853437399040',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
});