import { memo, useCallback, useState } from 'react';

interface PointSelectorProps {
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  selectionPoint: { x: number; y: number } | null;
  setSelectionPoint: (point: { x: number; y: number } | null) => void;
  recordingSaved: boolean;
  containerRef: React.RefObject<HTMLElement>;
}

export const PointSelector = memo(
  (props: PointSelectorProps) => {
    const {
      isSelectionMode,
      recordingSaved,
      setIsSelectionMode,
      selectionPoint,
      setSelectionPoint,
      containerRef,
    } = props;

    const [isCapturing, setIsCapturing] = useState(false);

    const handleSelectionClick = useCallback(async (event: React.MouseEvent) => {
      debugger;

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

      /*
      try {
        const stream = await initializeStream();

        if (!stream || !videoRef.current) {
          return;
        }

        // Wait for video to be ready
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Create temporary canvas for full screenshot
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth;
        tempCanvas.height = videoRef.current.videoHeight;

        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) {
          throw new Error('Failed to get temporary canvas context');
        }

        // Draw the full video frame
        tempCtx.drawImage(videoRef.current, 0, 0);

        // Calculate scale factor between video and screen
        const scaleX = videoRef.current.videoWidth / window.innerWidth;
        const scaleY = videoRef.current.videoHeight / window.innerHeight;

        // Get window scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY + 40;

        // Get the container's position in the page
        const containerRect = containerRef.current.getBoundingClientRect();

        // Offset adjustments for more accurate clipping
        const leftOffset = -9; // Adjust left position
        const bottomOffset = -14; // Adjust bottom position

        // Calculate the scaled coordinates with scroll offset and adjustments
        const scaledX = Math.round(
          (containerRect.left + Math.min(selectionStart.x, selectionEnd.x) + scrollX + leftOffset) * scaleX,
        );
        const scaledY = Math.round(
          (containerRect.top + Math.min(selectionStart.y, selectionEnd.y) + scrollY + bottomOffset) * scaleY,
        );
        const scaledWidth = Math.round(Math.abs(selectionEnd.x - selectionStart.x) * scaleX);
        const scaledHeight = Math.round(Math.abs(selectionEnd.y - selectionStart.y) * scaleY);

        // Create final canvas for the cropped area
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(Math.abs(selectionEnd.x - selectionStart.x));
        canvas.height = Math.round(Math.abs(selectionEnd.y - selectionStart.y));

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw the cropped area
        ctx.drawImage(tempCanvas, scaledX, scaledY, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        });

        // Create a FileReader to convert blob to base64
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64Image = e.target?.result as string;

          // Find the textarea element
          const textarea = document.querySelector('textarea');

          if (textarea) {
            // Get the setters from the BaseChat component
            const setUploadedFiles = (window as any).__BOLT_SET_UPLOADED_FILES__;
            const setImageDataList = (window as any).__BOLT_SET_IMAGE_DATA_LIST__;
            const uploadedFiles = (window as any).__BOLT_UPLOADED_FILES__ || [];
            const imageDataList = (window as any).__BOLT_IMAGE_DATA_LIST__ || [];

            if (setUploadedFiles && setImageDataList) {
              // Update the files and image data
              const file = new File([blob], 'screenshot.png', { type: 'image/png' });
              setUploadedFiles([...uploadedFiles, file]);
              setImageDataList([...imageDataList, base64Image]);
              toast.success('Screenshot captured and added to chat');
            } else {
              toast.error('Could not add screenshot to chat');
            }
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        toast.error('Failed to capture screenshot');

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      } finally {
        setIsCapturing(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        setIsSelectionMode(false); // Turn off selection mode after capture
      }
      */

      setIsCapturing(false);
      setIsSelectionMode(false); // Turn off selection mode after capture
    }, [isSelectionMode, containerRef, setIsSelectionMode]);

    if (!isSelectionMode) {
      if (recordingSaved) {
        // Draw an overlay to prevent interactions with the iframe
        // and to show the last point the user clicked (if there is one).
        return (
          <div
            className="absolute inset-0"
            onClick={(event) => event.preventDefault()}
          >
            { selectionPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${selectionPoint.x-8}px`,
                  top: `${selectionPoint.y-12}px`,
                }}
              >
                &#10060;
              </div>
            )}
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
      >
      </div>
    );
  },
);
