import { memo } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightbox = memo(({ imageUrl, onClose }: ImageLightboxProps) => {
  if (!imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <img
        src={imageUrl}
        alt="Expanded preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
});

ImageLightbox.displayName = 'ImageLightbox';
