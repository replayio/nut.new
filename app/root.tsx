import { sentryHandleError } from '~/lib/sentry';
import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunction } from '~/lib/remix-types';
import { json } from '~/lib/remix-types';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, useLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect, useState } from 'react';
import { logStore } from './lib/stores/logs';
import { initializeAuth, userStore, isLoadingStore } from './lib/stores/auth';
import { initializeUserStores } from './lib/stores/user';
import { ToastContainer, toast, cssTransition } from 'react-toastify';
import { Analytics } from '@vercel/analytics/remix';
import { AuthModal } from './components/auth/AuthModal';
import GlobalFeedbackModal from './components/sidebar/Feedback/components/FeedbackModal';
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

interface LoaderData {
  ENV: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    INTERCOM_APP_ID: string;
    INTERCOM_ACCESS_TOKEN: string;
  };
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

export const loader: LoaderFunction = async () => {
  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
  const publicIntercomAppId = process.env.INTERCOM_APP_ID as string;
  const intercomAccessToken = process.env.INTERCOM_ACCESS_TOKEN as string;

  return json<LoaderData>({
    ENV: {
      SUPABASE_URL: supabaseUrl,
      SUPABASE_ANON_KEY: supabaseAnonKey,
      INTERCOM_APP_ID: publicIntercomAppId,
      INTERCOM_ACCESS_TOKEN: intercomAccessToken,
    },
  });
};

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

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
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}

function AuthProvider({ data }: { data: LoaderData }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.ENV = data.ENV;

      // Initialize auth and user stores
      initializeAuth().catch((err: Error) => {
        logStore.logError('Failed to initialize auth', err);
        sentryHandleError(err);
        toast.error('Could not log in to the server. Please reload the page, or close other open tabs and try again', {
          autoClose: false,
          position: 'top-center',
          theme: 'colored',
        });
      });
      initializeUserStores().catch((err: Error) => {
        logStore.logError('Failed to initialize user stores', err);
      });
    }
  }, [data]);

  return null;
}

export const ErrorBoundary = () => {
  const error = useRouteError();

  // Using our conditional error handling instead of direct Sentry import
  sentryHandleError(error instanceof Error ? error : new Error(String(error)));

  return <div>Something went wrong</div>;
};

export default function App() {
  const data = useLoaderData<typeof loader>() as LoaderData;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.ENV = data.ENV;
    setMounted(true);
  }, []);

  // Only access stores on the client side
  const theme = useStore(themeStore);
  const user = useStore(userStore);
  const isLoading = useStore(isLoadingStore);

  useEffect(() => {
    if (mounted) {
      logStore.logSystem('Application initialized', {
        theme,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        isAuthenticated: !!user,
      });
    }
  }, [theme, user, mounted]);

  return (
    <>
      <ClientOnly>
        <ThemeProvider />
        <AuthProvider data={data} />
        <main className="h-full min-h-screen">{isLoading ? <div></div> : <Outlet />}</main>
        <ToastContainer
          closeButton={({ closeToast }) => {
            return (
              <button className="Toastify__close-button" onClick={closeToast}>
                <div className="i-ph:x text-lg" />
              </button>
            );
          }}
          icon={({ type }) => {
            switch (type) {
              case 'success': {
                return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
              }
              case 'error': {
                return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
              }
            }

            return undefined;
          }}
          position="bottom-right"
          theme={theme}
          pauseOnFocusLoss
          transition={toastAnimation}
        />
        <AuthModal />
        <GlobalFeedbackModal />
      </ClientOnly>
      <ScrollRestoration />
      <Scripts />
      <Analytics />
    </>
  );
}
