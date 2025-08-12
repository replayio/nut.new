import { useEffect } from 'react';
import { vibeAuthSupabase } from '~/lib/supabase/vibeAuthClient';
import { getCookieKey, getSupabase } from '~/lib/supabase/client';

interface UseOAuthForVibeAppProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeUrl: string | undefined;
  setIframeUrl: (url: string) => void;
  setUrl: (url: string) => void;
  reloadPreview: () => void;
  previewURL: string | undefined;
}

export function useOAuthForVibeApp({
  iframeRef,
  iframeUrl,
  setIframeUrl,
  setUrl,
  reloadPreview,
  previewURL,
}: UseOAuthForVibeAppProps) {
  useEffect(() => {
    let popup: WindowProxy | null = null;
    const handleIframeMessage = async (e: MessageEvent) => {
      if (e.data.type === 'oauth-request') {
        // save the value of sb-auth-auth-token from local stoage
        const supabaseAuth = localStorage.getItem(getCookieKey());
        if (supabaseAuth) {
          localStorage.setItem('sb-tmp-auth-token', supabaseAuth);
        }

        // We will redirect back to nut.new in this case.
        const currentOrigin = window.location.origin;
        const customRedirectUrl = `${currentOrigin}/auth/callback.html?callback_url=${encodeURIComponent(e.data.origin)}/auth/callback`;

        // Get the OAuth URL from vibeAuth Supabase
        const { data: authData, error } = await vibeAuthSupabase.auth.signInWithOAuth({
          provider: e.data.provider,
          options: {
            redirectTo: customRedirectUrl, // Use our custom redirect URL
            skipBrowserRedirect: true, // Important: prevent redirect in current window
          },
        });

        if (error) {
          return;
        }

        if (authData?.url) {
          // Open OAuth URL in a popup window
          const width = 500;
          const height = 600;
          const left = window.screenX + (window.innerWidth - width) / 2;
          const top = window.screenY + (window.innerHeight - height) / 2;

          popup = window.open(
            authData.url,
            'oauth-popup',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
          );
        }
      }
    };

    // Poll localStorage for the auth callback data
    const pollInterval = setInterval(() => {
      // Check for auth data
      const authDataStr = localStorage.getItem('vibe-auth-callback');
      const vibeAuthToken = localStorage.getItem('sb-auth-auth-token');
      const tmpToken = localStorage.getItem('sb-tmp-auth-token');

      if (authDataStr) {
        console.log('pollInterval', authDataStr, vibeAuthToken, tmpToken);
        if (authDataStr && vibeAuthToken && tmpToken) {
          debugger;
        }
        const authData = JSON.parse(authDataStr);

        // Clean up
        localStorage.removeItem('vibe-auth-callback');
        clearInterval(pollInterval);

        // Log the Supabase auth token that was stored
        const tempKey = JSON.parse(tmpToken ?? '{}');
        getSupabase().auth.setSession({
          access_token: tempKey.access_token,
          refresh_token: tempKey.refresh_token,
        });

        // Redirect the iframe with the auth session in the URL hash
        if (authData.session && iframeRef.current) {
          const { session, originalCallbackUrl } = authData;

          // Build the hash fragment with all session parameters
          const hashParams = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in.toString(),
            expires_at: session.expires_at.toString(),
            token_type: session.token_type,
            user: session.user,
          });

          // Construct the new URL with the auth hash
          const newIframeUrl = `${originalCallbackUrl}#${hashParams.toString()}`;
          console.log('newIframeUrl', newIframeUrl);
          // Update the iframe URL
          setIframeUrl(newIframeUrl);
          setUrl(newIframeUrl);
          setTimeout(() => {
            reloadPreview();
          }, 100);
        }

        return;
      }

      // Check for error
      const errorDataStr = localStorage.getItem('vibe-auth-callback-error');
      if (errorDataStr) {
        // Clean up
        localStorage.removeItem('vibe-auth-callback-error');
        clearInterval(pollInterval);
        return;
      }

      // Check if popup is closed
      if (popup && popup.closed) {
        clearInterval(pollInterval);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30000);
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      if (popup) {
        popup.close();
      }
    };
  }, [iframeRef, iframeUrl, setIframeUrl, setUrl, reloadPreview, previewURL]);
}
