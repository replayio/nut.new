// This file provides compatibility types to smoothly migrate from Cloudflare to Vercel

import type { 
  ActionFunctionArgs as VercelActionFunctionArgs,
  LoaderFunctionArgs as VercelLoaderFunctionArgs,
  AppLoadContext as VercelAppLoadContext,
  EntryContext as VercelEntryContext
} from '@vercel/remix';

// Re-export necessary types with compatible names
export type ActionFunctionArgs = VercelActionFunctionArgs;
export type LoaderFunctionArgs = VercelLoaderFunctionArgs;
export type LoaderFunction = (args: LoaderFunctionArgs) => Promise<Response> | Response;
export type ActionFunction = (args: ActionFunctionArgs) => Promise<Response> | Response;
export type AppLoadContext = VercelAppLoadContext;
export type EntryContext = VercelEntryContext;
export type MetaFunction = () => Array<{ 
  title?: string;
  name?: string;
  content?: string;
  [key: string]: string | undefined;
}>;
export type LinksFunction = () => Array<{ rel: string; href: string }>;

// Re-export json function 
export function json<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

// Export a createRequestHandler function
export function createRequestHandler(options: {
  build: any;
  mode?: string;
  getLoadContext?: (req: Request) => AppLoadContext;
}) {
  return async (request: Request) => {
    // This is a simplified handler for type checking
    // The real implementation will use Vercel's handler
    return new Response("Not implemented", { status: 501 });
  };
}