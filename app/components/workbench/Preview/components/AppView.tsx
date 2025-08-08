import { PointSelector } from '~/components/workbench/PointSelector';
import GripIcon from '~/components/icons/GripIcon';
import type { AppSummary } from '~/lib/persistence/messageAppSummary';
import ProgressStatus from './ProgressStatus';
import useViewport from '~/lib/hooks/useViewport';
import { useEffect } from 'react';
import { addTestAccount, loadTestAccounts } from '~/lib/stores/testAccounts';

export type ResizeSide = 'left' | 'right' | null;

const AppView = ({
  activeTab,
  appSummary,
  isDeviceModeOn,
  widthPercent,
  previewURL,
  iframeRef,
  iframeUrl,
  isSelectionMode,
  setIsSelectionMode,
  selectionPoint,
  setSelectionPoint,
  startResizing,
  setIframeUrl,
}: {
  activeTab: 'planning' | 'preview';
  appSummary: AppSummary | null;
  isDeviceModeOn: boolean;
  widthPercent: number;
  previewURL: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  iframeUrl: string;
  isSelectionMode: boolean;
  setIsSelectionMode: (isSelectionMode: boolean) => void;
  selectionPoint: { x: number; y: number } | null;
  setSelectionPoint: (selectionPoint: { x: number; y: number } | null) => void;
  startResizing: (e: React.MouseEvent, side: ResizeSide) => void;
  setIframeUrl: (url: string | undefined) => void;
}) => {
  const isSmallViewport = useViewport(1024);

  useEffect(() => {
    // Load existing test accounts on component mount
    loadTestAccounts();
    console.log('AppView mounted, loading test accounts...');

    // Helper function to process auth data
    const processAuthData = (tokenData: string, source: string) => {
      try {
        const authData = JSON.parse(tokenData);
        if (authData.access_token && authData.user) {
          console.log(`Valid auth data found in ${source}, adding test account:`, {
            userId: authData.user.id,
            email: authData.user.email,
            tokenPreview: authData.access_token.substring(0, 50) + '...',
          });

          // Add the test account to our store
          addTestAccount(authData);

          // Construct auth callback URL
          if (iframeRef.current) {
            const currentUrl = new URL(iframeRef.current.src);
            const authUrl = `${currentUrl.origin}/auth/callback#access_token=${authData.access_token}&expires_at=${authData.expires_at}&expires_in=${authData.expires_in}&refresh_token=${authData.refresh_token}&token_type=${authData.token_type}`;

            console.log(`Auth URL constructed from ${source}:`, {
              currentOrigin: currentUrl.origin,
              newAuthUrl: authUrl,
              tokenPreview: authData.access_token.substring(0, 50) + '...',
            });

            // Use setIframeUrl to properly update the iframe URL in the store
            setIframeUrl(authUrl);
          } else {
            console.warn('Cannot redirect: iframe ref is not available');
          }
        } else {
          console.warn(`Auth data from ${source} missing required fields:`, {
            hasAccessToken: !!authData.access_token,
            hasUser: !!authData.user,
            authData,
          });
        }
      } catch (error) {
        console.error(`Failed to parse auth token from ${source}:`, error);
      }
    };
    
    // Copy main app token to iframe-specific storage and check existing tokens
    const initializeIframeAuth = () => {
      if (typeof window === 'undefined') return;
      
      // First, copy the main app token to iframe-specific storage
      const keys = Object.keys(localStorage);
      const mainAuthKey = keys.find(key => key.includes('-auth-token') && !key.includes('iframe') && key !== 'sb-auth-auth-token');
      
      if (mainAuthKey) {
        const mainToken = localStorage.getItem(mainAuthKey);
        if (mainToken && mainToken.trim() !== '') {
          console.log('Found main app token, copying to iframe storage:', mainAuthKey);
          
          // Store it as iframe-specific token
          localStorage.setItem('sb-auth-auth-token', mainToken);
          
          // Process the main token to add it as the default account
          processAuthData(mainToken, 'main-app-copy');
        }
      }
      
      // Also check for other existing tokens
      const authTokenKeys = keys.filter(key => key.includes('-auth-token'));
      console.log('Found auth token keys:', authTokenKeys);
      
      authTokenKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && value.trim() !== '' && key !== mainAuthKey) { // Don't double-process the main token
          console.log(`Found existing token for key ${key}`);
          processAuthData(value, 'existing');
        }
      });
    };
    
    // Initialize iframe auth on mount
    initializeIframeAuth();

    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage event detected:', {
        key: e.key,
        hasOldValue: !!e.oldValue,
        hasNewValue: !!e.newValue,
        newValueEmpty: e.newValue === '' || e.newValue === null,
        eventType: e.oldValue && !e.newValue ? 'removal' : e.newValue ? 'addition/update' : 'unknown',
      });

      // Only listen for iframe-specific auth token changes
      if (e.key === 'sb-auth-auth-token') {
        console.log('Iframe auth token key detected:', e.key);
        // Handle token addition/update (newValue has token data)
        if (e.newValue && e.newValue.trim() !== '') {
          console.log('Auth token added/updated in localStorage, processing...');
          processAuthData(e.newValue, 'newValue');
        }
        // Handle token removal - sometimes the token data is in oldValue when it gets cleared
        else if (e.oldValue && e.oldValue.trim() !== '' && (!e.newValue || e.newValue.trim() === '')) {
          console.log('Auth token removed, but processing oldValue data...');
          processAuthData(e.oldValue, 'oldValue');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [iframeRef, setIframeUrl]);

  return (
    <div
      style={{
        width: isDeviceModeOn ? `${widthPercent}%` : '100%',
        height: '100%',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
      }}
      className="bg-bolt-elements-background-depth-1"
    >
      {previewURL ? (
        <>
          <iframe
            ref={iframeRef}
            title="preview"
            className={`w-full h-full bg-white transition-all duration-300 ${
              activeTab === 'preview'
                ? 'opacity-100 rounded-b-xl'
                : 'opacity-0 pointer-events-none absolute inset-0 rounded-none shadow-none border-none'
            }`}
            src={iframeUrl}
            allowFullScreen
            loading="eager"
          />
          {activeTab === 'preview' && !isSmallViewport && (
            <PointSelector
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              selectionPoint={selectionPoint}
              setSelectionPoint={setSelectionPoint}
              containerRef={iframeRef}
            />
          )}
          {activeTab !== 'preview' && (
            <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-2/30">
              {appSummary ? (
                <div className="p-8 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-lg">
                  <ProgressStatus />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-lg">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-bolt-elements-textSecondary font-medium">Preview loading...</div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-2/30">
          {appSummary ? (
            <div className="p-8 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-lg">
              <ProgressStatus />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-lg">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-bolt-elements-textSecondary font-medium">Preview loading...</div>
            </div>
          )}
        </div>
      )}

      {isDeviceModeOn && activeTab === 'preview' && (
        <>
          <div
            onMouseDown={(e) => startResizing(e, 'left')}
            className="absolute top-0 left-0 w-4 -ml-4 h-full cursor-ew-resize bg-bolt-elements-background-depth-2/50 hover:bg-bolt-elements-background-depth-3/70 flex items-center justify-center transition-all duration-200 select-none border-r border-bolt-elements-borderColor/30 hover:border-bolt-elements-borderColor/50 shadow-sm hover:shadow-md group"
            title="Drag to resize width"
          >
            <div className="transition-transform duration-200 group-hover:scale-110">
              <GripIcon />
            </div>
          </div>
          <div
            onMouseDown={(e) => startResizing(e, 'right')}
            className="absolute top-0 right-0 w-4 -mr-4 h-full cursor-ew-resize bg-bolt-elements-background-depth-2/50 hover:bg-bolt-elements-background-depth-3/70 flex items-center justify-center transition-all duration-200 select-none border-l border-bolt-elements-borderColor/30 hover:border-bolt-elements-borderColor/50 shadow-sm hover:shadow-md group"
            title="Drag to resize width"
          >
            <div className="transition-transform duration-200 group-hover:scale-110">
              <GripIcon />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AppView;
