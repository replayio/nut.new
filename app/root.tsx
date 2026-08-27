import type { LinksFunction, MetaFunction } from '~/lib/remix-types';
import { Links, Meta, Scripts, ScrollRestoration, useRouteError } from '@remix-run/react';
import { createHead } from 'remix-island';
import { ShutdownAnnouncement } from './components/ShutdownAnnouncement/ShutdownAnnouncement';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

export const meta: MetaFunction = () => {
  return [
    { title: 'Replay Builder has shut down' },
    {
      name: 'description',
      content: 'Replay Builder has evolved into Replay QA.',
    },
  ];
};

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <Meta />
    <Links />
  </>
));

export const ErrorBoundary = () => {
  useRouteError();
  return <ShutdownAnnouncement />;
};

export default function App() {
  return (
    <>
      <main className="h-full">
        <ShutdownAnnouncement />
      </main>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}
