import { json, type LoaderFunction } from '@remix-run/cloudflare';

export const loader: LoaderFunction = async ({ request }) => {
  // This route handles client-side requests to check authentication status
  // It's used by the auth store to initialize the session
  
  return json({
    isAuthenticated: false,
    message: 'This endpoint is currently for server-side use only'
  });
}; 