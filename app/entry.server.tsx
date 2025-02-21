import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { renderHeadToString } from 'remix-island';
import { Head, links } from './root';

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const head = renderHeadToString({ request, remixContext, Head });
  const html = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  const linkElements = links()
    .map(
      (link) =>
        `<link ${Object.entries(link)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ')}/>`
    )
    .join('\n');

  return new Response(
    `<!DOCTYPE html>
    <html lang="en" data-theme="light">
      <head>
        ${linkElements}
        ${head}
      </head>
      <body>
        <div id="root" class="w-full h-full">${html}</div>
      </body>
    </html>`,
    {
      status: responseStatusCode,
      headers: responseHeaders,
    }
  );
}
