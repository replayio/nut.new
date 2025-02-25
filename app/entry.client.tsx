import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { initSentry } from '~/lib/sentry-wrapper';

// Initialize Sentry in the browser environment
// Using our wrapper which handles module loading intelligently
initSentry({
  // Browser-specific configuration
  integrations: [],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}).catch(error => {
  console.error('Failed to initialize Sentry:', error);
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
