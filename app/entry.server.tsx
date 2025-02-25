import { sentryHandleError, Sentry } from '~/lib/sentry-wrapper';
import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { PassThrough } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';
import { isbot } from 'isbot';

export const handleError = sentryHandleError;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  // await initializeModelList({});

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => {
    abortController.abort();
  });

  return new Promise((resolve, reject) => {
    let didError = false;
    const head = renderHeadToString({ request, remixContext: remixContext as any, Head });
    
    // Determine if the request is from a bot
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = isbot(userAgent);
    
    // Function to create and return the response
    const handleResponse = () => {
      responseHeaders.set('Content-Type', 'text/html');
      responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
      responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

      const body = new PassThrough();
      
      body.write(
        `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
      );
      
      pipe(body);
      
      body.write('</div></body></html>');
      
      // Convert PassThrough to a ReadableStream to make it compatible with Response
      const bodyStream = new ReadableStream({
        start(controller) {
          body.on('data', (chunk) => {
            controller.enqueue(chunk);
          });
          body.on('end', () => {
            controller.close();
          });
          body.on('error', (err) => {
            controller.error(err);
          });
        },
      });
      
      resolve(
        new Response(bodyStream, {
          headers: responseHeaders,
          status: didError ? 500 : responseStatusCode,
        }),
      );
    };
    
    const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext as any} url={request.url} />, {
      // For bots, we want to wait until everything is ready before sending the response
      onAllReady() {
        // Only process for bots
        if (isBot) {
          handleResponse();
        }
      },
      // For normal browsers, send as soon as the shell is ready
      onShellReady() {
        // Skip for bots, they use onAllReady instead
        if (!isBot) {
          handleResponse();
        }
      },
      onShellError(error: unknown) {
        reject(error);
      },
      onError(error: unknown) {
        didError = true;
        console.error(error);
        Sentry.captureException(error);
      },
    });

    setTimeout(() => {
      abort();
    }, 5000);
  });
}
