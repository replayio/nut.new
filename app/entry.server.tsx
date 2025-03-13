import { sentryHandleError } from '~/lib/sentry';

/**
 * Using our conditional Sentry implementation instead of direct import
 * This avoids loading Sentry in development environments
 */
import type { AppLoadContext, EntryContext } from '~/lib/remix-types';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToString } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

export const handleError = sentryHandleError;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // Check if the request is from a bot
  const userAgent = request.headers.get('user-agent');
  const isBot = isbot(userAgent || '');

  // Create the HTML string
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  // @ts-ignore - Fix for incompatible EntryContext types between different remix versions
  const head = renderHeadToString({ request, remixContext, Head });

  // Build full HTML response
  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${themeStore.value}">
<head>${head}</head>
<body>
  <div id="root" class="w-full h-full">${markup}</div>
</body>
</html>`;

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(html, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
