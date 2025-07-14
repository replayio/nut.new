import { useStore } from '@nanostores/react';
import { memo, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import type { Message } from '~/lib/persistence/message';
import PlanView from './components/PlanView/PlanView';
import AppView, { type ResizeSide } from './components/AppView';
import type { ChatMode } from '~/lib/replay/ChatManager';
import Pages from './components/Pages';

let gCurrentIFrame: HTMLIFrameElement | undefined;

export function getCurrentIFrame() {
  return gCurrentIFrame;
}

interface PreviewProps {
  activeTab: 'planning' | 'layout' | 'preview';
  appSummary: AppSummary | null;
  handleSendMessage?: (event: React.UIEvent, messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => void;
  messages?: Message[];
  setActiveTab?: (tab: 'planning' | 'layout' | 'preview') => void;
}

export const Preview = memo(({ activeTab, appSummary, handleSendMessage, setActiveTab }: PreviewProps) => {
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
    <div ref={containerRef} className="w-full h-full flex flex-col relative">
      {isPortDropdownOpen && (
        <div className="z-iframe-overlay w-full h-full absolute" onClick={() => setIsPortDropdownOpen(false)} />
      )}
      <div className="bg-bolt-elements-background-depth-2 p-2 flex items-center gap-1.5">
        <IconButton icon="i-ph:arrow-clockwise" onClick={reloadPreview} />
        <IconButton
          icon="i-ph:bug-beetle"
          title="Point to Bug"
          onClick={() => {
            setSelectionPoint(null);
            setIsSelectionMode(!isSelectionMode);
          }}
          className={isSelectionMode ? 'bg-bolt-elements-background-depth-3' : ''}
        />
        <div
          className="flex items-center gap-1 flex-grow bg-bolt-elements-preview-addressBar-background border border-bolt-elements-borderColor text-bolt-elements-preview-addressBar-text rounded-full px-3 py-1 text-sm hover:bg-bolt-elements-preview-addressBar-backgroundHover hover:focus-within:bg-bolt-elements-preview-addressBar-backgroundActive focus-within:bg-bolt-elements-preview-addressBar-backgroundActive
        focus-within-border-bolt-elements-borderColorActive focus-within:text-bolt-elements-preview-addressBar-textActive"
        >
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

        {/* Device mode toggle button - only show in preview tab */}
        {activeTab === 'preview' && (
          <IconButton
            icon="i-ph:devices"
            onClick={toggleDeviceMode}
            title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
          />
        )}

        {/* Fullscreen toggle button */}
        <IconButton
          icon={isFullscreen ? 'i-ph:arrows-in' : 'i-ph:arrows-out'}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        />
      </div>

      <div className="flex-1 border-t border-bolt-elements-borderColor flex justify-center items-center overflow-auto">
        {activeTab === 'planning' ? (
          <PlanView appSummary={appSummary} handleSendMessage={handleSendMessage} setActiveTab={setActiveTab} />
        ) : activeTab === 'layout' ? (
          <Pages appSummary={appSummary} />
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
