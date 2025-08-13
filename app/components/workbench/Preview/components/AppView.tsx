import { PointSelector } from '~/components/workbench/PointSelector';
import GripIcon from '~/components/icons/GripIcon';
import ProgressStatus from './ProgressStatus';
import useViewport from '~/lib/hooks/useViewport';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { useState } from 'react';
import { useVibeAppAuthQuery } from '~/lib/hooks/useVibeAppAuth';

export type ResizeSide = 'left' | 'right' | null;

const AppView = ({
  activeTab,
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
}: {
  activeTab: 'planning' | 'testing' | 'preview';
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
}) => {
  const [iframeForceReload, setIframeForceReload] = useState(0);
  const appSummary = useStore(chatStore.appSummary);
  const isSmallViewport = useViewport(1024);
  const vibeAuthTokenParams = useVibeAppAuthQuery({ iframeForceReload, setIframeForceReload });

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
            key={iframeUrl + iframeForceReload}
            ref={iframeRef}
            title="preview"
            className={`w-full h-full bg-white transition-all duration-300 ${
              activeTab === 'preview'
                ? 'opacity-100 rounded-b-xl'
                : 'opacity-0 pointer-events-none absolute inset-0 rounded-none shadow-none border-none'
            }`}
            src={`${iframeUrl}#${vibeAuthTokenParams?.toString()}&force_refresh=${iframeForceReload}`}
            allowFullScreen
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-forms allow-modals"
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
