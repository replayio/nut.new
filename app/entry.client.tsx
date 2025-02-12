import * as Sentry from '@sentry/remix';
import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: 'client-dsn-goes-here',
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
