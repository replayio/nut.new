import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import AppView, { type ResizeSide } from './components/AppView';
import useViewport from '~/lib/hooks';
import { useVibeAppAuthPopup } from '~/lib/hooks/useVibeAppAuth';
import { RotateCw, Crosshair, MonitorSmartphone, Maximize2, Minimize2 } from '~/components/ui/Icon';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { useDevToolsInspector, type InspectedElement, type ElementTreeNode } from '~/lib/devtools';
import { DEVTOOLS_MESSAGE_SOURCE } from '~/lib/devtools/DevToolsBridge';

let gCurrentIFrameRef: React.RefObject<HTMLIFrameElement> | undefined;

export function getCurrentIFrame() {
  return gCurrentIFrameRef?.current ?? undefined;
}

/**
 * Convert DevTools element to workbench store format
 */
function convertDevToolsElementToStoreFormat(
  element: InspectedElement,
  tree: ElementTreeNode[],
): { component: Parameters<typeof workbenchStore.setSelectedElement>[0] extends infer T ? T extends { component: infer C } ? C : never : never; tree: Parameters<typeof workbenchStore.setSelectedElement>[0] extends infer T ? T extends { tree: infer C } ? C : never : never } {
  // Convert inspected element to component format
  const component = {
    displayName: element.displayName || undefined,
    name: element.displayName || undefined,
    props: element.props,
    state: element.state,
    type: element.type === 'function' ? 'function' as const : element.type === 'class' ? 'class' as const : 'host' as const,
    source: element.source ? {
      fileName: element.source.fileName || undefined,
      lineNumber: element.source.lineNumber || undefined,
      columnNumber: element.source.columnNumber || undefined,
    } : undefined,
  };

  // Convert tree to the expected format
  const convertedTree = tree.map((node) => ({
    displayName: node.displayName || undefined,
    name: node.displayName || undefined,
    type: node.type === 1 ? 'function' as const : node.type === 2 ? 'class' as const : 'host' as const,
  }));

  return { component, tree: convertedTree };
}

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useIsMobile();

  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isElementPickerEnabled, setIsElementPickerEnabled] = useState(false);
  const [isElementPickerReady, setIsElementPickerReady] = useState(false);
  const [useDevToolsMode, setUseDevToolsMode] = useState(false);

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [contentWindow, setContentWindow] = useState<Window | null>(null);

  const previewURL = useStore(workbenchStore.previewURL);

  const isSmallViewport = useViewport(800);
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

  gCurrentIFrameRef = iframeRef;

  // DevTools inspector callbacks
  const handleDevToolsElementSelected = useCallback((element: InspectedElement | null, tree: ElementTreeNode[]) => {
    if (element) {
      const converted = convertDevToolsElementToStoreFormat(element, tree);
      workbenchStore.setSelectedElement(converted);
      setIsElementPickerEnabled(false);
    }
  }, []);

  const handleDevToolsInspectingChange = useCallback((inspecting: boolean) => {
    setIsElementPickerEnabled(inspecting);
  }, []);

  const handleDevToolsReady = useCallback(() => {
    setIsElementPickerReady(true);
    setUseDevToolsMode(true);
  }, []);

  // Initialize DevTools inspector hook
  const devtools = useDevToolsInspector(contentWindow, {
    onElementSelected: handleDevToolsElementSelected,
    onInspectingChange: handleDevToolsInspectingChange,
    onReady: handleDevToolsReady,
  });

  const reloadPreview = (route = '') => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeUrl + route + '?forceReload=' + Date.now();
    }
  };

  // Send postMessage to control element picker in iframe (legacy mode)
  const toggleLegacyElementPicker = (enabled: boolean) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'ELEMENT_PICKER_CONTROL',
          enabled,
        },
        '*',
      );
    } else {
      console.warn('[Preview] Cannot send message - iframe not ready');
    }
  };

  // Toggle element picker - uses DevTools if available, falls back to legacy
  const toggleElementPicker = useCallback((enabled: boolean) => {
    if (useDevToolsMode && devtools.isReady) {
      if (enabled) {
        devtools.startInspecting();
      } else {
        devtools.stopInspecting();
      }
    } else {
      toggleLegacyElementPicker(enabled);
    }
  }, [useDevToolsMode, devtools]);

  // Listen for messages from iframe (legacy element picker and DevTools backend ready)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Legacy element picker messages
      if (event.data.type === 'ELEMENT_PICKED') {
        // Store the full element data including the react tree
        workbenchStore.setSelectedElement({
          component: event.data.react.component,
          tree: event.data.react.tree,
        });
        setIsElementPickerEnabled(false);
      } else if (event.data.type === 'ELEMENT_PICKER_STATUS') {
        // Status update from legacy picker
      } else if (event.data.type === 'ELEMENT_PICKER_READY' && event.data.source === 'element-picker') {
        // Legacy element picker is ready
        if (!useDevToolsMode) {
          setIsElementPickerReady(true);
        }
      }
      // DevTools backend ready message
      else if (event.data.source === DEVTOOLS_MESSAGE_SOURCE && event.data.type === 'devtools-backend-ready') {
        // DevTools backend is initialized in iframe
        setUseDevToolsMode(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [useDevToolsMode]);

  // Update contentWindow when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const handleLoad = () => {
      setContentWindow(iframe.contentWindow);
    };

    iframe.addEventListener('load', handleLoad);

    // If iframe is already loaded, set contentWindow
    if (iframe.contentWindow) {
      setContentWindow(iframe.contentWindow);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [iframeUrl]);

  useEffect(() => {
    if (!previewURL) {
      setUrl('');
      setIframeUrl(undefined);
      setContentWindow(null);

      return;
    }

    setUrl(previewURL);
    setIframeUrl(previewURL);
    setIsElementPickerReady(false);
    setUseDevToolsMode(false);
    setContentWindow(null);
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
      <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor border-opacity-50 p-3 flex items-center gap-2 shadow-sm">
        <IconButton icon={<RotateCw size={20} />} onClick={() => reloadPreview()} />
        {isElementPickerReady && !isMobile && (
          <IconButton
            className={classNames({
              'bg-bolt-elements-background-depth-3': isElementPickerEnabled,
            })}
            iconClassName={isElementPickerEnabled ? 'text-[#4da3ff]' : ''}
            icon={<Crosshair size={20} />}
            onClick={() => {
              const newState = !isElementPickerEnabled;
              setIsElementPickerEnabled(newState);
              toggleElementPicker(newState);
            }}
            title="Select element on page"
          />
        )}
        <div
          className={classNames(
            'flex items-center gap-2 flex-grow bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textSecondary px-4 py-2 text-sm hover:bg-bolt-elements-background-depth-3 hover:border-bolt-elements-borderColor focus-within:bg-bolt-elements-background-depth-3 focus-within:border-blue-500/50 focus-within:text-bolt-elements-textPrimary transition-all duration-200 shadow-sm hover:shadow-md',
            {
              'rounded-xl': !isSmallViewport,
            },
          )}
        >
          <input
            title="URL"
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none focus:ring-0 focus:ring-offset-0 p-0"
            type="text"
            value={url}
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

        {!isSmallViewport && (
          <IconButton
            icon={<MonitorSmartphone size={20} />}
            onClick={toggleDeviceMode}
            title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
          />
        )}
        {!isSmallViewport && (
          <IconButton
            icon={isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          />
        )}
      </div>

      <div className="flex-1 bg-bolt-elements-background-depth-2 bg-opacity-30 flex justify-center items-center overflow-auto">
        <AppView
          isDeviceModeOn={isDeviceModeOn}
          iframeRef={iframeRef}
          iframeUrl={iframeUrl ?? ''}
          previewURL={url}
          startResizing={startResizing}
          widthPercent={widthPercent}
        />
      </div>
    </div>
  );
});
