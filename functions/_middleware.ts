import * as Sentry from '@sentry/cloudflare';

export const onRequest = [
  // Make sure Sentry is the first middleware
  Sentry.sentryPagesPlugin((_context) => ({
    dsn: 'server-dsn-goes-here',
  })),

  // if we ever add more middleware, add them below:
];
