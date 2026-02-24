import { memo, useEffect, useRef, useState } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { designPanelStore } from '~/lib/stores/designSystemStore';
import { elementPickerStore, setIsElementPickerEnabled, setIsElementPickerReady } from '~/lib/stores/elementPicker';
import AppView, { type ResizeSide } from './components/AppView';
import MultiDevicePreview, { type MultiDevicePreviewRef } from './components/InfiniteCanvas/MultiDevicePreview';
import { ComponentBreadcrumb } from './components/ComponentBreadcrumb';
import { useVibeAppAuthPopup } from '~/lib/hooks/useVibeAppAuth';
import { Monitor, ExternalLink, Eye, Paintbrush, Shrink, RefreshCcw, Fullscreen } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { Button } from '~/components/ui/button';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { getCurrentIFrame, setCurrentIFrameRef } from './iframeRef';

export { getCurrentIFrame };

type PreviewMode = 'preview' | 'editor';

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const multiDevicePreviewRef = useRef<MultiDevicePreviewRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMouseOverPreviewRef = useRef(false);
  const isSmallViewport = useViewport(1024);

  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMode, setActiveMode] = useState<PreviewMode>('preview');

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();

  const previewURL = useStore(workbenchStore.previewURL);
  const previewLoading = useStore(chatStore.previewLoading);
  const isPreviewReady = previewURL && !previewLoading;
  const selectedElement = useStore(workbenchStore.selectedElement);
  const isElementPickerEnabled = useStore(elementPickerStore.isEnabled);
  const isElementPickerReady = useStore(elementPickerStore.isReady);

  // Toggle between responsive mode and device mode
  const [isDeviceModeOn, setIsDeviceModeOn] = useState(false);

  // Use percentage for width
  const [widthPercent, setWidthPercent] = useState<number>(37.5);

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startWidthPercent: 37.5,
    windowWidth: window.innerWidth,
  });

  const SCALING_FACTOR = 2;

  setCurrentIFrameRef(iframeRef);

  const reloadPreview = (route = '') => {
    if (isDeviceModeOn && multiDevicePreviewRef.current) {
      multiDevicePreviewRef.current.reloadAll();
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeUrl + route + '?forceReload=' + Date.now();
    }
    setIsElementPickerReady(false);
    setIsElementPickerEnabled(false);
  };

  // Toggle element picker in iframe
  const toggleElementPicker = (enabled: boolean) => {
    const iframe = getCurrentIFrame();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'ELEMENT_PICKER_CONTROL',
          enabled,
        },
        '*',
      );
    }
  };

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_PICKED') {
        workbenchStore.setSelectedElement({
          component: event.data.react.component,
          tree: event.data.react.tree,
        });
        setIsElementPickerEnabled(false);

        const disableMessage = { type: 'ELEMENT_PICKER_CONTROL', enabled: false };
        if (multiDevicePreviewRef.current) {
          multiDevicePreviewRef.current.postMessageToAll(disableMessage);
        }
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(disableMessage, '*');
        }
      } else if (event.data.type === 'ELEMENT_PICKER_STATUS') {
        // Status update from iframe
      } else if (event.data.type === 'ELEMENT_PICKER_READY' && event.data.source === 'element-picker') {
        setIsElementPickerReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!previewURL) {
      setUrl('');
      setIframeUrl(undefined);
      return;
    }

    setUrl(previewURL);
    setIframeUrl(previewURL);
    setIsElementPickerReady(false);
    setIsElementPickerEnabled(false);
  }, [previewURL]);

  // Handle OAuth authentication
  useVibeAppAuthPopup({
    iframeRef,
    iframeUrl,
    setIframeUrl,
    setUrl,
    reloadPreview,
    previewURL,
  });

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

    document.body.style.userSelect = 'none';

    resizingState.current.isResizing = true;
    resizingState.current.side = side;
    resizingState.current.startX = e.clientX;
    resizingState.current.startWidthPercent = widthPercent;
    resizingState.current.windowWidth = window.innerWidth;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingState.current.isResizing) {
      return;
    }

    const dx = e.clientX - resizingState.current.startX;
    const windowWidth = resizingState.current.windowWidth;
    const dxPercent = (dx / windowWidth) * 100 * SCALING_FACTOR;

    let newWidthPercent = resizingState.current.startWidthPercent;

    if (resizingState.current.side === 'right') {
      newWidthPercent = resizingState.current.startWidthPercent + dxPercent;
    } else if (resizingState.current.side === 'left') {
      newWidthPercent = resizingState.current.startWidthPercent - dxPercent;
    }

    newWidthPercent = Math.max(10, Math.min(newWidthPercent, 90));
    setWidthPercent(newWidthPercent);
  };

  const onMouseUp = () => {
    resizingState.current.isResizing = false;
    resizingState.current.side = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    const handleWindowResize = () => {
      // widthPercent is relative, no action needed
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Prevent back navigation when over preview
  useEffect(() => {
    window.history.pushState({ preventBack: true }, '');

    let isRestoringState = false;

    const handlePopState = (_event: PopStateEvent) => {
      if (isRestoringState) {
        isRestoringState = false;
        return;
      }

      const themeChanges = designPanelStore.themeChanges.get();
      const hasUnsavedChanges = themeChanges.hasChanges;

      if (isMouseOverPreviewRef.current && hasUnsavedChanges) {
        const confirmed = window.confirm(
          'You have unsaved changes in the design panel. Are you sure you want to navigate away?',
        );
        if (!confirmed) {
          isRestoringState = true;
          window.history.pushState({ preventBack: true }, '');
          return;
        }
      } else if (isMouseOverPreviewRef.current) {
        const confirmed = window.confirm('Are you sure you want to navigate away?');
        if (!confirmed) {
          isRestoringState = true;
          window.history.pushState({ preventBack: true }, '');
          return;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleMouseEnter = () => {
    isMouseOverPreviewRef.current = true;
  };

  const handleMouseLeave = () => {
    isMouseOverPreviewRef.current = false;
  };

  const openInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
    }
  };

  const handleElementPickerToggle = () => {
    if (!isElementPickerReady) {
      return;
    }
    const newState = !isElementPickerEnabled;
    setIsElementPickerEnabled(newState);
    toggleElementPicker(newState);
  };

  return (
    <TooltipProvider>
      <div ref={containerRef} className="w-full h-full flex flex-col relative bg-card">
        {isPortDropdownOpen && (
          <div className="z-iframe-overlay w-full h-full absolute" onClick={() => setIsPortDropdownOpen(false)} />
        )}

        {/* Top Navigation Bar */}
        {isPreviewReady && (
          <div className="bg-card border-b border-border p-2 flex items-center justify-between gap-2">
            {/* Left: Preview/Editor Toggle */}
            {!isSmallViewport && (
              <div className="flex items-center h-9 bg-muted rounded-lg p-1">
                <button
                  onClick={() => {
                    setActiveMode('preview');
                    handleElementPickerToggle();
                  }}
                  className={classNames(
                    'flex items-center justify-center gap-2 px-2 py-1 text-sm font-medium rounded-md transition-all',
                    activeMode === 'preview'
                      ? 'bg-background text-foreground border border-input shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Eye size={16} />
                  Preview
                </button>
                <button
                  onClick={() => {
                    setActiveMode('editor');
                    handleElementPickerToggle();
                  }}
                  className={classNames(
                    'flex items-center justify-center gap-2 px-2 py-1 text-sm font-medium rounded-md transition-all',
                    activeMode === 'editor'
                      ? 'bg-background text-foreground border border-input shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  disabled={!isElementPickerReady || isSmallViewport}
                >
                  <Paintbrush size={16} />
                  Editor
                </button>
              </div>
            )}

            {/* Center: Device Selector + URL */}
            <div className="flex h-9 w-fit items-center justify-center gap-1 border border-border border-solid rounded-full px-1">
              {/* Device Dropdown */}
              <Button
                variant="outline"
                onClick={toggleDeviceMode}
                className="flex items-center gap-1.5 h-7 px-3 text-sm text-muted-foreground hover:text-foreground rounded-full"
              >
                <Monitor size={16} />
                {isDeviceModeOn ? 'Multi-Device' : 'Desktop'}
              </Button>

              {/* URL Input */}
              <div className="flex items-center px-2 w-fit">
                <input
                  title="URL"
                  ref={inputRef}
                  className="w-[100px] sm:w-[200px] md:w-[200px] lg:w-[200px] xl:w-[200px] bg-transparent text-sm text-muted-foreground border-none outline-none focus:ring-0 p-0 truncate"
                  type="text"
                  value={url}
                  placeholder="https://"
                  onChange={(event) => {
                    setUrl(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      if (url !== iframeUrl) {
                        setIframeUrl(url);
                      } else {
                        reloadPreview();
                      }

                      if (inputRef.current) {
                        inputRef.current.blur();
                      }
                    }
                  }}
                />
              </div>

              <WithTooltip tooltip="Open in new tab">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openInNewTab}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={16} />
                </Button>
              </WithTooltip>

              <WithTooltip tooltip="Reload">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => reloadPreview()}
                  className="h-7 w-7 min-w-7 text-muted-foreground hover:text-foreground border border-border rounded-full p-0"
                >
                  <RefreshCcw size={16} />
                </Button>
              </WithTooltip>
            </div>

            <WithTooltip tooltip="Toggle full screen">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                {isFullscreen ? <Shrink size={16} /> : <Fullscreen size={16} />}
              </Button>
            </WithTooltip>
          </div>
        )}

        {/* Preview Area */}
        <div
          className={`flex-1 bg-muted/30 ${isDeviceModeOn ? 'overflow-hidden' : 'flex justify-center items-center overflow-auto'}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {isDeviceModeOn ? (
            <MultiDevicePreview ref={multiDevicePreviewRef} iframeUrl={iframeUrl ?? ''} />
          ) : (
            <AppView
              isDeviceModeOn={isDeviceModeOn}
              iframeRef={iframeRef}
              iframeUrl={iframeUrl ?? ''}
              previewURL={url}
              startResizing={startResizing}
              widthPercent={widthPercent}
            />
          )}
        </div>

        {/* Bottom: Breadcrumb Navigation */}
        {!isSmallViewport && <ComponentBreadcrumb selectedElement={selectedElement} />}
      </div>
    </TooltipProvider>
  );
});
