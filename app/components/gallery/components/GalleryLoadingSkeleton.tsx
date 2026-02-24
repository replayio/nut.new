import { memo } from 'react';
import { classNames } from '~/utils/classNames';

interface GalleryLoadingSkeletonProps {
  isSmallViewport?: boolean;
  isSidebarCollapsed?: boolean;
}

export const GalleryLoadingSkeleton = memo(
  ({ isSmallViewport = false, isSidebarCollapsed = false }: GalleryLoadingSkeletonProps) => (
    <div
      className={classNames(
        'h-full flex items-center justify-center transition-all duration-300',
        !isSmallViewport
          ? isSidebarCollapsed
            ? 'md:pl-[calc(60px+1.5rem)] md:pr-6'
            : 'md:pl-[calc(260px+1.5rem)] md:pr-6'
          : 'px-4 sm:px-6',
      )}
    >
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fade-in">
          <div className="p-8">
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-border border-t-rose-500 animate-spin" />
                <div
                  className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-pink-500/30 animate-spin"
                  style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium mb-1">Loading template...</p>
                <p className="text-sm text-muted-foreground">Preparing your preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
);

GalleryLoadingSkeleton.displayName = 'GalleryLoadingSkeleton';
