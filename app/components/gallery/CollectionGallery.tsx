import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { CollectionCard } from './components/CollectionCard';
import { getCollections, type CollectionPageIndexEntry } from '~/lib/replay/ReferenceApps';
import { classNames } from '~/utils/classNames';
import useViewport from '~/lib/hooks';
import { Spinner } from '~/components/ui/Spinner';

type SortOption = 'nameAsc' | 'nameDesc';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'nameAsc', label: 'Name A-Z' },
  { value: 'nameDesc', label: 'Name Z-A' },
];

interface CollectionGalleryProps {
  className?: string;
}

export const CollectionGallery = ({ className }: CollectionGalleryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collections, setCollections] = useState<CollectionPageIndexEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('nameAsc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const isSmallViewport = useViewport(1024);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    setCanScrollPrev(container.scrollLeft > 0);
    setCanScrollNext(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        setIsLoading(true);
        const data = await getCollections();
        setCollections(data);
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, []);

  const filteredCollections = useMemo(() => {
    const filtered = searchTerm.trim()
      ? collections.filter((collection) => collection.name.toLowerCase().includes(searchTerm.toLowerCase().trim()))
      : collections;

    const sorted = [...filtered];
    if (sortBy === 'nameAsc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    }
    return sorted;
  }, [collections, searchTerm, sortBy]);

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Name A-Z';

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const timer = setTimeout(updateScrollButtons, 100);
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, filteredCollections, isSmallViewport]);

  const scrollPrev = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('button')?.offsetWidth ?? container.clientWidth;
    container.scrollBy({ left: -cardWidth - 16, behavior: 'smooth' });
  }, []);

  const scrollNext = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    const cardWidth = container.querySelector('button')?.offsetWidth ?? container.clientWidth;
    container.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
  }, []);

  return (
    <div className={classNames('w-full max-w-[1337px] mx-auto', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Collections</h2>
            <p className="text-muted-foreground">Apps for different use cases</p>
          </div>

          {!isSmallViewport && (
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
                  placeholder="Search collections"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[285px] pl-9 pr-4 py-2 text-sm bg-transparent border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        {isSmallViewport && (
          <>
            {/* Sort dropdown - mobile */}
            <div className="relative">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <span className="text-muted-foreground">Sort:</span>
                <span>{currentSortLabel}</span>
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
          </>
        )}

        {isSmallViewport && (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search collections"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-sm bg-transparent border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" text="Loading collections..." />
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Search className="w-8 h-8 text-muted-foreground" />
            <p className="text-muted-foreground">No collections found</p>
          </div>
        </div>
      ) : isSmallViewport ? (
        <>
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredCollections.map((collection) => (
              <div
                key={collection.collectionPath}
                className="flex-shrink-0 snap-start"
                style={{ width: 'calc(100% - 2rem)' }}
              >
                <CollectionCard collection={collection} className="w-full h-full" />
              </div>
            ))}
          </div>

          {filteredCollections.length > 1 && (
            <div className="flex items-center justify-between mt-1 mb-4">
              <button
                type="button"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className={classNames(
                  'flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                  canScrollPrev
                    ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                    : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                )}
                aria-label="Previous collection"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className={classNames(
                  'flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border transition-all',
                  canScrollNext
                    ? 'text-foreground active:scale-95 hover:bg-accent cursor-pointer'
                    : 'text-muted-foreground/40 cursor-not-allowed opacity-50',
                )}
                aria-label="Next collection"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredCollections.map((collection) => (
            <CollectionCard key={collection.collectionPath} collection={collection} className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionGallery;
