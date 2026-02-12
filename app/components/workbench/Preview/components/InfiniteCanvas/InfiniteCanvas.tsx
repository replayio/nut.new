import React, { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { themeStore } from '~/lib/stores/theme';
import { useStore } from '@nanostores/react';

interface InfiniteCanvasProps {
  children: ReactNode;
  className?: string;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  gridSize?: number;
  showGrid?: boolean;
}

export default function InfiniteCanvas({
  children,
  className = '',
  initialZoom = 0.5,
  minZoom = 0.1,
  maxZoom = 2,
  gridSize = 20,
  showGrid = true,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: initialZoom,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoomInputValue, setZoomInputValue] = useState(String(Math.round(initialZoom * 100)));

  const mode = useStore(themeStore);

  // Keep zoom input in sync with transform.scale
  useEffect(() => {
    setZoomInputValue(String(Math.round(transform.scale * 100)));
  }, [transform.scale]);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setZoomInputValue(value);
  };

  const applyZoomFromInput = () => {
    const numValue = parseInt(zoomInputValue, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const newScale = Math.min(maxZoom, Math.max(minZoom, numValue / 100));
      setTransform((prev) => ({ ...prev, scale: newScale }));
      setZoomInputValue(String(Math.round(newScale * 100)));
    } else {
      // Reset to current zoom if invalid
      setZoomInputValue(String(Math.round(transform.scale * 100)));
    }
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyZoomFromInput();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setZoomInputValue(String(Math.round(transform.scale * 100)));
      (e.target as HTMLInputElement).blur();
    }
  };

  // Center the canvas on mount and when container resizes
  useEffect(() => {
    const updateTransform = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Center the viewport - devices start at x=0, y=0
          // With initial zoom of 0.4, we need to account for device widths
          // Total width: desktop (1920) + gap (100) + tablet (768) + gap (200) + mobile (375) = 3363px
          // Scaled width at 0.4 zoom: 3363 * 0.4 = 1345px
          const totalDeviceWidth = 1920 + 100 + 768 + 200 + 375; // desktop + gap + tablet + gap + mobile
          const scaledWidth = totalDeviceWidth * initialZoom;
          const scaledHeight = 1080 * initialZoom; // Using desktop height as reference
          setTransform((prev) => ({
            ...prev,
            x: rect.width / 2 - scaledWidth / 2, // Center the devices horizontally
            y: rect.height / 2 - scaledHeight / 2, // Center vertically
          }));
        }
      }
    };

    // Initial positioning
    updateTransform();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateTransform);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [initialZoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

      // Detect zoom gesture: Ctrl/Cmd key pressed (trackpad pinch sends ctrl+wheel)
      const isZoomGesture = e.ctrlKey || e.metaKey;

      if (isZoomGesture) {
        // Zoom gesture
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom
        const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(maxZoom, Math.max(minZoom, transform.scale * zoomFactor));

        // Calculate new position to zoom towards mouse
        const scaleChange = newScale / transform.scale;
        const newX = mouseX - (mouseX - transform.x) * scaleChange;
        const newY = mouseY - (mouseY - transform.y) * scaleChange;

        setTransform({
          x: newX,
          y: newY,
          scale: newScale,
        });
      } else {
        // Pan gesture (two-finger scroll on trackpad)
        setTransform((prev) => ({
          ...prev,
          x: prev.x - deltaX,
          y: prev.y - deltaY,
        }));
      }
    },
    [transform, minZoom, maxZoom],
  );

  // Ensure wheel listener is non-passive to block page zoom/scroll/nav when interacting with the canvas
  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      // Always prevent default to stop browser back/forward navigation on horizontal swipe
      event.preventDefault();
      event.stopPropagation();

      // Delegate to the React handler; casting is safe here
      handleWheel(event as unknown as React.WheelEvent);
    };

    node.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });
    return () => {
      node.removeEventListener('wheel', handleNativeWheel, { capture: true } as EventListenerOptions);
    };
  }, [handleWheel]);

  // Touch pan and pinch handling
  const touchPanState = useRef({ startX: 0, startY: 0 });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) {
        // Multi-touch gesture (pinch) - prevent default zoom/scroll
        e.preventDefault();
        return;
      }

      // Single-finger pan start
      const touch = e.touches[0];
      touchPanState.current = { startX: touch.clientX - transform.x, startY: touch.clientY - transform.y };
      setIsPanning(true);
    },
    [transform.x, transform.y],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) {
        // Pinch - prevent page zoom
        e.preventDefault();
        return;
      }

      if (!isPanning) {
        return;
      }

      const touch = e.touches[0];
      e.preventDefault();
      setTransform((prev) => ({
        ...prev,
        x: touch.clientX - touchPanState.current.startX,
        y: touch.clientY - touchPanState.current.startY,
      }));
    },
    [isPanning],
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan if clicking on the canvas background, not on children
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBackground) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        e.preventDefault();
      }
    },
    [transform.x, transform.y],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) {
        return;
      }

      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      }));
    },
    [isPanning, startPan],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Fit all devices in view
  const fitToView = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: 0.25,
    }));
  }, []);

  // Generate grid background
  const gridColor = mode === 'dark' ? '#374151' : '#e2e8f0';
  const bgColor = mode === 'dark' ? '#1f2937' : '#f1f5f9';
  const gridPattern = showGrid ? `radial-gradient(circle, ${gridColor} 1px, transparent 1px)` : 'none';

  const gridBackgroundSize = `${gridSize * transform.scale}px ${gridSize * transform.scale}px`;
  const gridBackgroundPosition = `${transform.x % (gridSize * transform.scale)}px ${transform.y % (gridSize * transform.scale)}px`;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full ${className}`}
      style={{
        background: bgColor,
        backgroundImage: gridPattern,
        backgroundSize: gridBackgroundSize,
        backgroundPosition: gridBackgroundPosition,
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent default touch behaviors including pinch-to-zoom
        overscrollBehavior: 'none', // Prevent scroll chaining to the page
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-canvas-background="true"
    >
      {/* Zoom controls - horizontal at bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center gap-2 rounded-md px-3 py-2 shadow-md bg-card border border-border">
        {/* Zoom controls */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.max(minZoom, prev.scale * 0.8) }))}
          title="Zoom out"
        >
          <span className="text-sm font-medium">−</span>
        </button>
        <div className="relative flex items-center">
          <input
            type="text"
            inputMode="numeric"
            value={zoomInputValue}
            onChange={handleZoomInputChange}
            onBlur={applyZoomFromInput}
            onKeyDown={handleZoomInputKeyDown}
            className="w-12 text-center text-xs font-medium bg-transparent text-muted-foreground focus:text-foreground focus:outline-none rounded-md"
            title="Enter zoom percentage"
          />
          <span className="text-xs text-muted-foreground ml-1">%</span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => setTransform((prev) => ({ ...prev, scale: Math.min(maxZoom, prev.scale * 1.2) }))}
          title="Zoom in"
        >
          <span className="text-sm font-medium">+</span>
        </button>

        <div className="mx-1 h-6 border-l border-border" />

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={fitToView}
          title="Fit to view"
        >
          <span className="text-xs">⊡</span>
        </button>
      </div>

      {/* Transformed content */}
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
