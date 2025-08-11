import { useStore } from '@nanostores/react';
import { memo, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import PlanView from './components/PlanView/PlanView';
import AppView, { type ResizeSide } from './components/AppView';
import useViewport from '~/lib/hooks';
import { vibeAuthSupabase } from '~/lib/supabase/vibeAuthClient';
import { getSupabase } from '~/lib/supabase/client';

let gCurrentIFrame: HTMLIFrameElement | undefined;

export function getCurrentIFrame() {
  return gCurrentIFrame;
}

interface PreviewProps {
  activeTab: 'planning' | 'preview';
  appSummary: AppSummary | null;
}

export const Preview = memo(({ activeTab, appSummary }: PreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionPoint, setSelectionPoint] = useState<{ x: number; y: number } | null>(null);

  const previewURL = useStore(workbenchStore.previewURL);
  const isSmallViewport = useViewport(1024);
  // Toggle between responsive mode and device mode
  const [isDeviceModeOn, setIsDeviceModeOn] = useState(false);

  // Use percentage for width
  const [widthPercent, setWidthPercent] = useState<number>(37.5); // 375px assuming 1000px window width initially

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startWidthPercent: 37.5,
    windowWidth: window.innerWidth,
  });

  // Define the scaling factor
  const SCALING_FACTOR = 2; // Adjust this value to increase/decrease sensitivity

  gCurrentIFrame = iframeRef.current ?? undefined;

  useEffect(() => {
    if (!previewURL) {
      setUrl('');
      setIframeUrl(undefined);
      setSelectionPoint(null);

      return;
    }

    setUrl(previewURL);
    setIframeUrl(previewURL);
  }, [previewURL]);

  // Listen for general iframe messages and sign out on logout request
  useEffect(() => {
    let popup: WindowProxy | null = null;
    const handleIframeMessage = async (e: MessageEvent) => {
      try {

        if (e.data.type === 'oauth-request') {
          // save the value of sb-zbkcavxidjyslqmnbfux-auth-token from local stoage
          const supabaseAuth = localStorage.getItem('sb-zbkcavxidjyslqmnbfux-auth-token');
          if (supabaseAuth) {
            localStorage.setItem('sb-tmp-auth-token', supabaseAuth);
          }

          // TODO: This is a temporary fix to allow the iframe to open the OAuth popup.
          console.log('preview.message: oauth-request received from iframe', JSON.stringify(e.data, null, 2));

          // Build our custom redirect URL
          const currentOrigin = window.location.origin;
          const customRedirectUrl = `${currentOrigin}/auth/vibe-callback?callback_url=${encodeURIComponent(e.data.origin)}`;

          // Get the OAuth URL from vibeAuth Supabase
          const { data: authData, error } = await vibeAuthSupabase.auth.signInWithOAuth({
            provider: e.data.provider,
            options: {
              redirectTo: customRedirectUrl, // Use our custom redirect URL
              skipBrowserRedirect: true, // Important: prevent redirect in current window
            },
          });

          if (error) {
            console.error('preview.message: OAuth error', error);
            return;
          }

          if (authData?.url) {
            console.log('preview.message: OAuth URL generated:', authData.url);
            console.log('preview.message: Using custom redirect URL:', customRedirectUrl);

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
      } catch (err) {
        console.error('preview.message: unexpected error handling postMessage', err);
      }
    };
    // Poll localStorage for the auth callback data
    const pollInterval = setInterval(() => {
      try {
        // Check for auth data
        const authDataStr = localStorage.getItem('vibe-auth-callback');
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          console.log('preview.message: Found auth data in localStorage', authData);
          
          // Clean up
          localStorage.removeItem('vibe-auth-callback');
          clearInterval(pollInterval);
          
          // Log the Supabase auth token that was stored
          const supabaseKey = 'sb-auth-auth-token';
          const supabaseAuth = localStorage.getItem(supabaseKey);
          console.log('preview.message: Supabase auth token stored in localStorage:', supabaseKey, supabaseAuth);
          const tempKey = JSON.parse(localStorage.getItem('sb-tmp-auth-token') ?? '{}');
          getSupabase().auth.setSession({
            access_token: tempKey.access_token,
            refresh_token: tempKey.refresh_token,
          });
          // localStorage.removeItem('sb-tmp-auth-token');

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
              force_refresh: Date.now().toString(),
            });
            
            if (session.provider_token) {
              hashParams.set('provider_token', session.provider_token);
            }
            
            // Construct the new URL with the auth hash
            const baseUrl = originalCallbackUrl || iframeUrl || '';
            const separator = baseUrl.includes('#') ? '&' : '#';
            const newIframeUrl = `${baseUrl}${separator}${hashParams.toString()}`;
            
            console.log('preview.message: Redirecting iframe to:', newIframeUrl);
            
            // Update the iframe URL
            setIframeUrl(newIframeUrl);
            setUrl(newIframeUrl);
            reloadPreview();
          }
          
          return;
        }
        
        // Check for error
        const errorDataStr = localStorage.getItem('vibe-auth-callback-error');
        if (errorDataStr) {
          const errorData = JSON.parse(errorDataStr);
          console.error('preview.message: OAuth error from callback:', errorData);
          
          // Clean up
          localStorage.removeItem('vibe-auth-callback-error');
          clearInterval(pollInterval);
          return;
        }
        
        // Check if popup is closed
        if (popup && popup.closed) {
          console.log('preview.message: OAuth popup was closed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('preview.message: Error polling localStorage:', err);
      }
    }, 100); // Poll every 100ms
    
    // Stop polling after 30 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log('preview.message: Stopped polling after timeout');
    }, 30000);
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      if (popup) {
        popup.close();
      }
    };
  }, [previewURL, iframeUrl]);

  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }

    setIsSelectionMode(false);
    setSelectionPoint(null);
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleDeviceMode = () => {
    setIsDeviceModeOn((prev) => !prev);
  };

  const startResizing = (e: React.MouseEvent, side: ResizeSide) => {
    if (!isDeviceModeOn) {
      return;
    }

    // Prevent text selection
    document.body.style.userSelect = 'none';

    resizingState.current.isResizing = true;
    resizingState.current.side = side;
    resizingState.current.startX = e.clientX;
    resizingState.current.startWidthPercent = widthPercent;
    resizingState.current.windowWidth = window.innerWidth;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault(); // Prevent any text selection on mousedown
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingState.current.isResizing) {
      return;
    }

    const dx = e.clientX - resizingState.current.startX;
    const windowWidth = resizingState.current.windowWidth;

    // Apply scaling factor to increase sensitivity
    const dxPercent = (dx / windowWidth) * 100 * SCALING_FACTOR;

    let newWidthPercent = resizingState.current.startWidthPercent;

    if (resizingState.current.side === 'right') {
      newWidthPercent = resizingState.current.startWidthPercent + dxPercent;
    } else if (resizingState.current.side === 'left') {
      newWidthPercent = resizingState.current.startWidthPercent - dxPercent;
    }

    // Clamp the width between 10% and 90%
    newWidthPercent = Math.max(10, Math.min(newWidthPercent, 90));

    setWidthPercent(newWidthPercent);
  };

  const onMouseUp = () => {
    resizingState.current.isResizing = false;
    resizingState.current.side = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Restore text selection
    document.body.style.userSelect = '';
  };

  // Handle window resize to ensure widthPercent remains valid
  useEffect(() => {
    const handleWindowResize = () => {
      /*
       * Optional: Adjust widthPercent if necessary
       * For now, since widthPercent is relative, no action is needed
       */
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col relative bg-bolt-elements-background-depth-1">
      {isPortDropdownOpen && (
        <div className="z-iframe-overlay w-full h-full absolute" onClick={() => setIsPortDropdownOpen(false)} />
      )}
      {activeTab === 'preview' && (
        <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor/50 p-3 flex items-center gap-2 shadow-sm">
          <IconButton icon="i-ph:arrow-clockwise" onClick={reloadPreview} />
          {!isSmallViewport && (
            <IconButton
              icon="i-ph:bug-beetle"
              title="Point to Bug"
              onClick={() => {
                setSelectionPoint(null);
                setIsSelectionMode(!isSelectionMode);
              }}
              className={isSelectionMode ? 'bg-bolt-elements-background-depth-3' : ''}
            />
          )}
          <div className="flex items-center gap-2 flex-grow bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textSecondary rounded-xl px-4 py-2 text-sm hover:bg-bolt-elements-background-depth-3 hover:border-bolt-elements-borderColor focus-within:bg-bolt-elements-background-depth-3 focus-within:border-blue-500/50 focus-within:text-bolt-elements-textPrimary transition-all duration-200 shadow-sm hover:shadow-md">
            <input
              title="URL"
              ref={inputRef}
              className="w-full bg-transparent outline-none"
              type="text"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
              }}
              onKeyDown={(event) => {
                let newUrl;

                if (event.key === 'Enter') {
                  setIframeUrl(newUrl);

                  if (inputRef.current) {
                    inputRef.current.blur();
                  }
                }
              }}
            />
          </div>

          {activeTab === 'preview' && !isSmallViewport && (
            <IconButton
              icon="i-ph:devices"
              onClick={toggleDeviceMode}
              title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
            />
          )}
          {!isSmallViewport && (
            <IconButton
              icon={isFullscreen ? 'i-ph:arrows-in' : 'i-ph:arrows-out'}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            />
          )}
        </div>
      )}

      <div className="flex-1 bg-bolt-elements-background-depth-2/30 flex justify-center items-center overflow-auto">
        {activeTab === 'planning' ? (
          <PlanView appSummary={appSummary} />
        ) : (
          <AppView
            activeTab={activeTab}
            appSummary={appSummary}
            isDeviceModeOn={isDeviceModeOn}
            iframeRef={iframeRef}
            iframeUrl={iframeUrl ?? ''}
            isSelectionMode={isSelectionMode}
            previewURL={url}
            selectionPoint={selectionPoint}
            setIsSelectionMode={setIsSelectionMode}
            setSelectionPoint={setSelectionPoint}
            startResizing={startResizing}
            widthPercent={widthPercent}
          />
        )}
      </div>
    </div>
  );
});
