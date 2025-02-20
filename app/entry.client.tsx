import * as Sentry from '@sentry/remix';
import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: 'https://5465638ce4f73a256d861820b3a4dad4@o437061.ingest.us.sentry.io/4508853437399040',
  integrations: [Sentry.replayIntegration()],

  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
