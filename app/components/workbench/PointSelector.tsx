import { memo, useCallback, useState } from 'react';
import { getMouseData, type MouseData } from '~/lib/replay/MessageHandler';

interface PointSelectorProps {
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  selectionPoint: { x: number; y: number } | null;
  setSelectionPoint: (point: { x: number; y: number } | null) => void;
  containerRef: React.RefObject<HTMLIFrameElement>;
}

let gCurrentMouseData: MouseData | undefined;

export function getCurrentMouseData() {
  return gCurrentMouseData;
}

export const PointSelector = memo((props: PointSelectorProps) => {
  const { isSelectionMode, setIsSelectionMode, selectionPoint, setSelectionPoint, containerRef } = props;

  const [isCapturing, setIsCapturing] = useState(false);
  const [mouseData, setMouseData] = useState<MouseData | undefined>(undefined);

  gCurrentMouseData = mouseData;

  const handleSelectionClick = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isSelectionMode || !containerRef.current) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setSelectionPoint({ x, y });

      setIsCapturing(true);

      const mouseData = await getMouseData(containerRef.current, { x, y });
      console.log('MouseData', mouseData);
      setMouseData(mouseData);

      setIsCapturing(false);
      setIsSelectionMode(false); // Turn off selection mode after capture
    },
    [isSelectionMode, containerRef, setIsSelectionMode],
  );

  if (!isSelectionMode) {
    if (selectionPoint) {
      /*
       * Draw an overlay to prevent interactions with the iframe
       * and to show the last point the user clicked.
       */
      return (
        <div className="absolute inset-0" onClick={(event) => event.preventDefault()}>
          <div
            style={{
              position: 'absolute',
              left: `${selectionPoint.x - 8}px`,
              top: `${selectionPoint.y - 12}px`,
            }}
          >
            &#10060;
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  return (
    <div
      className="absolute inset-0"
      onClick={handleSelectionClick}
      style={{
        backgroundColor: isCapturing ? 'transparent' : 'rgba(0, 0, 0, 0.1)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'all',
        opacity: isCapturing ? 0 : 1,
        zIndex: 50,
        transition: 'opacity 0.1s ease-in-out',
      }}
    ></div>
  );
});
