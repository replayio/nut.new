/** Central gate for retired Builder resource endpoints. UI is handled solely by root.tsx. */

export function isRetiredResourcePath(pathname: string): boolean {
  if (pathname === '/api/health') {
    return false;
  }

  if (pathname.startsWith('/api/')) {
    return true;
  }

  // e.g. /view-diff.raw
  if (pathname.endsWith('.raw')) {
    return true;
  }

  return false;
}

export function goneResponse(message = 'Replay Builder has shut down. Visit https://www.replay.io/') {
  return new Response(JSON.stringify({ error: 'gone', message }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function maybeGoneResponse(request: Request): Response | null {
  const { pathname } = new URL(request.url);
  return isRetiredResourcePath(pathname) ? goneResponse() : null;
}
