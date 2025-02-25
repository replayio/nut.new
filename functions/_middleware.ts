// import * as Sentry from '@sentry/cloudflare';

// No-op middleware since we're migrating away from Cloudflare
export const onRequest = [
  (context: any) => {
    console.log('Middleware: Using no-op implementation');
    return context.next();
  }
];
