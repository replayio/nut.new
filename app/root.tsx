import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { themeStore, type Theme } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect, useState } from 'react';
import { logStore } from './lib/stores/logs';

// @ts-ignore
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
// @ts-ignore
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
// @ts-ignore
import globalStyles from './styles/index.scss?url';
// @ts-ignore
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

// Declare module types for CSS imports
declare module '*.css' {
  const url: string;
  export default url;
}

declare module '*.scss' {
  const url: string;
  export default url;
}

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
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

export const loader: LoaderFunction = async ({ context }) => {
  return json({
    ENV: {
      SUPABASE_URL: context.SUPABASE_URL,
      SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY,
    },
  });
};

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}

function ThemeProvider() {
  const theme = useStore(themeStore);

  useEffect(() => {
    const savedTheme = localStorage.getItem('bolt_theme') as Theme | null;
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      themeStore.set(savedTheme);
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeStore.set(isDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
    logStore.logSystem('Theme updated', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    });
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <>
      <ClientOnly>
        <ThemeProvider />
      </ClientOnly>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
    </>
  );
}
