import { useEffect, useState } from 'react';
import { vibeAuthSupabase } from '~/lib/supabase/vibeAuthClient';

interface UseOAuthForVibeAppProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeUrl: string | undefined;
  setIframeUrl: (url: string) => void;
  setUrl: (url: string) => void;
  reloadPreview: () => void;
  previewURL: string | undefined;
}

export function useVibeAppAuthPopup({
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

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      if (popup) {
        popup.close();
      }
    };
  }, [iframeRef, iframeUrl, setIframeUrl, setUrl, reloadPreview, previewURL]);
}
export function useVibeAppAuthQuery({
  iframeForceReload,
  setIframeForceReload,
}: {
  iframeForceReload: number;
  setIframeForceReload: (forceReload: number) => void;
}) {
  const [vibeAuthTokenParams, setVibeAuthTokenParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    function queryLocalstorageForVibeToken() {
      const vibeAuthToken = localStorage.getItem('sb-vibe-auth-token') ?? '{}';

      if (vibeAuthToken !== '{}') {
        const vibeAuthTokenJson = JSON.parse(vibeAuthToken);
        const vibeAuthTokenParams = new URLSearchParams(vibeAuthTokenJson);
        if (vibeAuthToken !== '{}') {
          setVibeAuthTokenParams(vibeAuthTokenParams);
          setIframeForceReload(iframeForceReload + 1);
        }
      }
    }
    queryLocalstorageForVibeToken();
    const interval = setInterval(queryLocalstorageForVibeToken, 100);
    return () => clearInterval(interval);
  }, []);
  return vibeAuthTokenParams;
}
