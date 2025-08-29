import { useEffect, useState } from 'react';

interface UseOAuthForVibeAppProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeUrl: string | undefined;
  setIframeUrl: (url: string) => void;
  setUrl: (url: string) => void;
  reloadPreview: (route?: string) => void;
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
    let popup: Window | null = null;
    const handleIframeMessage = async (e: MessageEvent) => {
      if (e.data.type === 'oauth-request') {
        // We will redirect back to nut.new in this case.
        const currentOrigin = window.location.origin;
        const customRedirectUrl = `${currentOrigin}/auth/callback.html?callback_url=${encodeURIComponent(e.data.origin)}/auth/callback`;

        // Construct the OAuth URL directly (no Supabase)
        let appId = e.data.appId;

        // If appId is not set, try to extract it from the current URL
        if (!appId) {
          const currentPath = window.location.pathname;
          const appIdMatch = currentPath.match(/^\/app\/([^\/]+)/);
          if (appIdMatch) {
            appId = appIdMatch[1];
          }
        }

        const provider = encodeURIComponent(e.data.provider);
        const oauthUrl = `https://auth.nut.new/functions/v1/oauth/start?app_id=${encodeURIComponent(appId)}&provider=${provider}&redirect_to=${encodeURIComponent(customRedirectUrl)}`;

        // Open OAuth URL in a popup window
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;

        try {
          popup = window.open(
            oauthUrl,
            `${e.data.provider}-auth`,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes`,
          );
        } catch (_err) {
          // Do nothing
        }

        // Listen for storage changes to detect auth completion
        const handleStorageChange = (event: StorageEvent) => {
          if (event.key === 'sb-vibe-auth-token' || event.key === 'auth-callback-trigger') {
            const currentSession = localStorage.getItem('sb-vibe-auth-token');
            if (currentSession) {
              const sessionData = JSON.parse(currentSession);
              if (sessionData.access_token) {
                // Valid session detected
                window.removeEventListener('storage', handleStorageChange);
                reloadPreview('/auth/callback');
                popup?.close();
              }
            }
          }
        };

        window.addEventListener('storage', handleStorageChange);
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
