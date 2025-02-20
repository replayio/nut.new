import * as Sentry from '@sentry/cloudflare';

export const onRequest = [
  // Make sure Sentry is the first middleware
  Sentry.sentryPagesPlugin((_context) => ({
    dsn: 'https://5465638ce4f73a256d861820b3a4dad4@o437061.ingest.us.sentry.io/4508853437399040',
  })),

  // if we ever add more middleware, add them below:
];
