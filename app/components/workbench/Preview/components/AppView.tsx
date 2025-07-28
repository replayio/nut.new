import { PointSelector } from '~/components/workbench/PointSelector';
import GripIcon from '~/components/icons/GripIcon';
import type { AppSummary } from '~/lib/persistence/messageAppSummary';
import FeatureProgress from './StatusProgress';
import useViewport from '~/lib/hooks/useViewport';

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
}: {
  activeTab: 'planning' | 'testing' | 'preview';
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
}) => {
  const isSmallViewport = useViewport(1024);
  return (
    <div
      style={{
        width: isDeviceModeOn ? `${widthPercent}%` : '100%',
        height: '100%',
        overflow: 'visible',
        background: '#fff',
        position: 'relative',
        display: 'flex',
      }}
    >
      {previewURL ? (
        <>
          <iframe
            ref={iframeRef}
            title="preview"
            className="border-none w-full h-full bg-white"
            src={iframeUrl}
            allowFullScreen
          />
          {!isSmallViewport && (
            <PointSelector
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              selectionPoint={selectionPoint}
              setSelectionPoint={setSelectionPoint}
              containerRef={iframeRef}
            />
          )}
        </>
      ) : (
        <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1">
          {appSummary ? (
            <FeatureProgress />
          ) : (
            <div className="text-bolt-elements-textSecondary">Preview loading...</div>
          )}
        </div>
      )}

      {isDeviceModeOn && activeTab === 'preview' && (
        <>
          <div
            onMouseDown={(e) => startResizing(e, 'left')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '15px',
              marginLeft: '-15px',
              height: '100%',
              cursor: 'ew-resize',
              background: 'rgba(255,255,255,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              userSelect: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.5)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
            title="Drag to resize width"
          >
            <GripIcon />
          </div>
          <div
            onMouseDown={(e) => startResizing(e, 'right')}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '15px',
              marginRight: '-15px',
              height: '100%',
              cursor: 'ew-resize',
              background: 'rgba(255,255,255,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              userSelect: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.5)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
            title="Drag to resize width"
          >
            <GripIcon />
          </div>
        </>
      )}
    </div>
  );
};

export default AppView;
