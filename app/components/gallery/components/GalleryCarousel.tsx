import { memo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, SquareMousePointer, AppWindowMac } from 'lucide-react';
import { classNames } from '~/utils/classNames';

export interface CarouselItem {
  type: 'preview' | 'feature';
  id: string;
  feature?: { name: string };
}

interface GalleryCarouselProps {
  items: CarouselItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

export const GalleryCarousel = memo(({ items, currentIndex, onIndexChange, className }: GalleryCarouselProps) => {
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const scrollPrev = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const scrollNext = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  useEffect(() => {
    const button = buttonRefs.current.get(currentIndex);
    if (button) {
      const container = button.parentElement;
      if (container) {
        const buttonRect = button.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const isOutOfViewLeft = buttonRect.left < containerRect.left;
        const isOutOfViewRight = buttonRect.right > containerRect.right;

        if (isOutOfViewLeft || isOutOfViewRight) {
          button.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }
    }
  }, [currentIndex]);

  if (items.length <= 1) {
    return null;
  }

  return (
    <div className={classNames('flex items-center justify-center gap-2 px-2', className)}>
      <button
        onClick={scrollPrev}
        disabled={currentIndex === 0}
        className={classNames(
          'w-8 h-8 rounded-full flex items-center justify-center transition-colors aspect-square',
          currentIndex === 0
            ? 'opacity-50 cursor-not-allowed bg-muted'
            : 'bg-muted hover:bg-accent border border-border',
        )}
      >
        <ChevronLeft size={16} className="text-muted-foreground" />
      </button>
      <div className="flex-1 overflow-x-auto scrollbar-hide max-w-[600px]">
        <div className="flex gap-2 justify-center">
          {items.map((item, idx) => (
            <button
              key={idx}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(idx, el);
                } else {
                  buttonRefs.current.delete(idx);
                }
              }}
              onClick={() => onIndexChange(idx)}
              className={classNames(
                'flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg transition-all min-w-[150px] truncate border-2',
                idx === currentIndex
                  ? 'border-black bg-white text-black shadow-sm'
                  : 'border-transparent bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {item.type === 'preview' ? (
                <>
                  <SquareMousePointer
                    size={18}
                    className={idx === currentIndex ? 'text-black' : 'text-muted-foreground'}
                  />
                  <span className="text-xs font-medium">Live App</span>
                </>
              ) : (
                <>
                  <AppWindowMac size={18} className={idx === currentIndex ? 'text-black' : 'text-muted-foreground'} />
                  <span className="text-xs font-medium">{item.feature?.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={scrollNext}
        disabled={currentIndex === items.length - 1}
        className={classNames(
          'w-8 h-8 rounded-full flex items-center justify-center transition-colors aspect-square',
          currentIndex === items.length - 1
            ? 'opacity-50 cursor-not-allowed bg-muted'
            : 'bg-muted hover:bg-accent border border-border',
        )}
      >
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
});

GalleryCarousel.displayName = 'GalleryCarousel';
