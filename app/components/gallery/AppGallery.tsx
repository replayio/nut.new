import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { AppCard } from './components/AppCard';
import { NewAppCard } from './components/NewAppCard';
import { database, type AppLibraryEntry } from '~/lib/persistence/apps';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/button';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { chatStore } from '~/lib/stores/chat';
import { logger } from '~/utils/logger';
import useViewport from '~/lib/hooks';

type SortOption = 'createdAt' | 'updatedAt' | 'title';
type DialogContent = { type: 'delete'; item: AppLibraryEntry } | null;

const skipConfirmDeleteCookieName = 'skipConfirmDelete';

interface AppGalleryProps {
  variant?: 'recent' | 'all';
  maxItems?: number;
  onNewApp?: () => void;
  onAppClick?: (app: AppLibraryEntry) => void;
  className?: string;
}

export const AppGallery = ({ variant = 'recent', maxItems = 4, onNewApp, onAppClick, className }: AppGalleryProps) => {
  const [apps, setApps] = useState<AppLibraryEntry[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [skipConfirmDeleteChecked, setSkipConfirmDeleteChecked] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const isSmallViewport = useViewport(1024);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { filteredItems: filteredApps, handleSearchChange } = useSearchFilter({
    items: apps ?? [],
    searchFields: ['title'],
  });

  // Update scroll button states
  const updateScrollButtons = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    setCanScrollPrev(container.scrollLeft > 0);
    setCanScrollNext(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  // Fetch apps on mount
  const loadApps = useCallback(() => {
    setIsLoading(true);
    database
      .getAllAppEntries()
      .then(setApps)
      .catch((error) => toast.error(error.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Initialize and update scroll buttons on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    // Delay to ensure DOM is updated
    const timer = setTimeout(updateScrollButtons, 100);
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, filteredApps, isSmallViewport]);

  // Navigation functions for mobile carousel
  const scrollPrev = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('div')?.offsetWidth ?? container.clientWidth;
    container.scrollBy({ left: -cardWidth - 16, behavior: 'smooth' });
  }, []);

  const scrollNext = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('div')?.offsetWidth ?? container.clientWidth;
    container.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
  }, []);

  // Delete app handler
  const deleteItem = useCallback(
    (event: React.UIEvent, item: AppLibraryEntry) => {
      event.preventDefault();

      // Optimistically remove from UI
      setApps(apps?.filter((app) => app.id !== item.id));

      database
        .deleteApp(item.id)
        .then(() => {
          toast.success('App deleted successfully');

          if (chatStore.currentAppId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete app');
          logger.error(error);
          // Reload apps on error
          loadApps();
        });
    },
    [apps, loadApps],
  );

  const closeDialog = () => {
    setDialogContent(null);
    setSkipConfirmDeleteChecked(false);
  };

  const handleDeleteClick = (event: React.UIEvent, item: AppLibraryEntry) => {
    event.preventDefault();

    const skipConfirmDelete = Cookies.get(skipConfirmDeleteCookieName);

    if (skipConfirmDelete === 'true') {
      deleteItem(event, item);
    } else {
      setDialogContent({ type: 'delete', item });
    }
  };

  // Sort apps
  const sortedApps = useMemo(() => {
    const sorted = [...filteredApps];

    switch (sortBy) {
      case 'createdAt':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'updatedAt':
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }, [filteredApps, sortBy]);

  // Get display apps based on variant
  const displayApps = variant === 'recent' ? sortedApps.slice(0, maxItems) : sortedApps;

  const handleAppClick = (app: AppLibraryEntry) => {
    if (onAppClick) {
      onAppClick(app);
    } else {
      window.location.href = `/app/${app.id}`;
    }
  };

  const handleNewApp = () => {
    if (onNewApp) {
      onNewApp();
    } else {
      window.location.href = '/';
    }
  };

  const handleViewAll = () => {
    window.location.href = '/projects';
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'createdAt', label: 'Creation Date' },
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'title', label: 'Name' },
  ];

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Last Updated';

  // Delete confirmation dialog component (shared between variants)
  const deleteConfirmationDialog = (
    <DialogRoot open={dialogContent !== null}>
      <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
        {dialogContent?.type === 'delete' && (
          <>
            <DialogTitle>Delete App?</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>
                  You are about to delete <strong>{dialogContent.item.title}</strong>.
                </p>
                <p className="mt-1">Are you sure you want to delete this app?</p>
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipConfirmDeleteGallery"
                    checked={skipConfirmDeleteChecked}
                    onChange={(e) => {
                      setSkipConfirmDeleteChecked(e.target.checked);
                    }}
                  />
                  <label htmlFor="skipConfirmDeleteGallery" className="text-sm">
                    Don't ask me again
                  </label>
                </div>
              </div>
            </DialogDescription>
            <div className="px-5 pb-4 bg-muted flex gap-2 justify-end">
              <DialogButton type="secondary" onClick={closeDialog}>
                Cancel
              </DialogButton>
              <DialogButton
                type="danger"
                onClick={(event) => {
                  deleteItem(event, dialogContent.item);
                  closeDialog();

                  if (skipConfirmDeleteChecked) {
                    Cookies.set(skipConfirmDeleteCookieName, 'true');
                  }
                }}
              >
                Delete
              </DialogButton>
            </div>
          </>
        )}
      </Dialog>
    </DialogRoot>
  );

  if (variant === 'recent') {
    return (
      <div className={classNames('w-full max-w-[1337px] mx-auto', className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">My Recent Projects</h2>
          <Button variant="outline" size="sm" className="gap-2 rounded-full text-foreground" onClick={handleViewAll}>
            View All
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : isSmallViewport ? (
          // Mobile carousel
          <>
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {displayApps.map((app) => (
                <div key={app.id} className="flex-shrink-0 snap-start" style={{ width: 'calc(100% - 2rem)' }}>
                  <AppCard
                    app={app}
                    onClick={() => handleAppClick(app)}
                    onDelete={(event) => handleDeleteClick(event, app)}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {/* Navigation arrows - only show if more than 1 card */}
            {displayApps.length > 1 && (
              <div className="flex items-center justify-between px-4 mt-4 mb-4">
                <button
                  type="button"
                  onClick={scrollPrev}
                  disabled={!canScrollPrev}
                  className={classNames(
                    'flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                    canScrollPrev
                      ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                      : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                  )}
                  aria-label="Previous project"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  disabled={!canScrollNext}
                  className={classNames(
                    'flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                    canScrollNext
                      ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                      : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                  )}
                  aria-label="Next project"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Desktop horizontal scrolling cards */
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {displayApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onClick={() => handleAppClick(app)}
                onDelete={(event) => handleDeleteClick(event, app)}
              />
            ))}
          </div>
        )}

        {deleteConfirmationDialog}
      </div>
    );
  }

  // Full "all" variant
  return (
    <div className={classNames('w-full max-w-[1337px] mx-auto', className)}>
      {/* Header - responsive layout */}
      {isSmallViewport ? (
        // Mobile header
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground mt-1">Manage and create your projects</p>
          </div>

          {/* Full-width search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                handleSearchChange(e);
              }}
              className="w-full pl-9 pr-4 py-3 text-sm bg-transparent border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <span>
                <span className="text-muted-foreground">Sort: </span>
                {currentSortLabel}
              </span>
              <ChevronDown
                className={classNames('w-4 h-4 transition-transform', { 'rotate-180': isSortDropdownOpen })}
              />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortDropdownOpen(false);
                    }}
                    className={classNames(
                      'w-full px-4 py-3 text-sm text-left transition-colors',
                      sortBy === option.value
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-foreground hover:bg-accent/50',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Desktop header
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground mt-1">Manage and create your projects</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <span className="text-muted-foreground">Sort By:</span>
                <span>{currentSortLabel}</span>
                <ChevronDown
                  className={classNames('w-4 h-4 transition-transform', { 'rotate-180': isSortDropdownOpen })}
                />
              </button>

              {isSortDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={classNames(
                        'w-full px-4 py-2 text-sm text-left transition-colors',
                        sortBy === option.value
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-foreground hover:bg-accent/50',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  handleSearchChange(e);
                }}
                className="w-48 pl-9 pr-4 py-2 text-sm bg-transparent border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      ) : displayApps.length === 0 && !searchValue ? (
        // Empty state (no apps at all)
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground" />
            <p className="text-foreground font-medium">No projects yet</p>
            <p className="text-muted-foreground">Create your first project to get started</p>
            <Button onClick={handleNewApp} className="mt-2">
              Create New Project
            </Button>
          </div>
        </div>
      ) : displayApps.length === 0 ? (
        // No results from search
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <Search className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No projects found matching "{searchValue}"</p>
          </div>
        </div>
      ) : isSmallViewport ? (
        // Mobile carousel
        <>
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* New App Card as first card in carousel */}
            <div className="flex-shrink-0 snap-start" style={{ width: 'calc(100% - 2rem)' }}>
              <NewAppCard onClick={handleNewApp} className="w-full" />
            </div>
            {displayApps.map((app) => (
              <div key={app.id} className="flex-shrink-0 snap-start" style={{ width: 'calc(100% - 2rem)' }}>
                <AppCard
                  app={app}
                  onClick={() => handleAppClick(app)}
                  onDelete={(event) => handleDeleteClick(event, app)}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Navigation arrows - only show if more than 1 card (counting NewAppCard) */}
          {displayApps.length >= 1 && (
            <div className="flex items-center justify-between px-4 mt-4 mb-4">
              <button
                type="button"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className={classNames(
                  'flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                  canScrollPrev
                    ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                    : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                )}
                aria-label="Previous project"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className={classNames(
                  'flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                  canScrollNext
                    ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                    : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                )}
                aria-label="Next project"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Desktop grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <NewAppCard onClick={handleNewApp} className="w-full" />
          {displayApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onClick={() => handleAppClick(app)}
              onDelete={(event) => handleDeleteClick(event, app)}
              className="w-full"
            />
          ))}
        </div>
      )}

      {deleteConfirmationDialog}
    </div>
  );
};

export default AppGallery;
