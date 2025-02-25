import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Sentry from '@sentry/remix';
import { initSentry } from '~/lib/sentry-wrapper';

// Initialize Sentry in the browser environment
// Using our wrapper which handles module loading intelligently
initSentry({
  // Browser-specific configuration
  dsn: 'https://5465638ce4f73a256d861820b3a4dad4@o437061.ingest.us.sentry.io/4508853437399040',
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}).catch(error => {
  console.error('Failed to initialize Sentry:', error);
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
