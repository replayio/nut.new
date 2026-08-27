import { maybeGoneResponse } from './app/lib/shutdown';

/**
 * Vercel edge middleware — plugs retired API/resource holes before Remix.
 * UI routes pass through and are overridden by root.tsx.
 */
export default function middleware(request: Request) {
  return maybeGoneResponse(request) ?? undefined;
}

export const config = {
  matcher: ['/api/:path*', '/:path*.raw'],
};
