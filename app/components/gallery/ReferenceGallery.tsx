import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, Briefcase, Users, User, Code, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReferenceAppCard } from './components/ReferenceAppCard';
import { getReferenceAppSummaries, type ReferenceAppSummary } from '~/lib/replay/ReferenceApps';
import { classNames } from '~/utils/classNames';
import useViewport from '~/lib/hooks';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Spinner } from '~/components/ui/Spinner';
import { Checkbox } from '~/components/ui/Checkbox';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  All: <Sparkles className="w-4 h-4" />,
  Business: <Briefcase className="w-4 h-4" />,
  Social: <Users className="w-4 h-4" />,
  Personal: <User className="w-4 h-4" />,
  Technical: <Code className="w-4 h-4" />,
};

// Stage priority order (higher index = higher priority)
const STAGE_PRIORITY: Record<string, number> = {
  release: 3,
  beta: 2,
  alpha: 1,
};

// Sort apps: Sales CRM first, then by stage (release > beta > alpha), then alphabetically
const sortApps = (apps: ReferenceAppSummary[]): ReferenceAppSummary[] => {
  return [...apps].sort((a, b) => {
    // Sales CRM always comes first
    if (a.name === 'Sales CRM') {
      return -1;
    }
    if (b.name === 'Sales CRM') {
      return 1;
    }

    // Sort by stage priority (release > beta > alpha)
    const aPriority = STAGE_PRIORITY[a.stage] ?? 0;
    const bPriority = STAGE_PRIORITY[b.stage] ?? 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Same stage - sort alphabetically
    return a.name.localeCompare(b.name);
  });
};

type ReferenceSortOption = 'stage' | 'nameAsc' | 'nameDesc';

const referenceSortOptions: { value: ReferenceSortOption; label: string }[] = [
  { value: 'stage', label: 'Stage (Release first)' },
  { value: 'nameAsc', label: 'Name A-Z' },
  { value: 'nameDesc', label: 'Name Z-A' },
];

interface ReferenceGalleryProps {
  className?: string;
}

export const ReferenceGallery = ({ className }: ReferenceGalleryProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ReferenceSortOption>('stage');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [referenceApps, setReferenceApps] = useState<ReferenceAppSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const isSmallViewport = useViewport(1024);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update scroll button states
  const updateScrollButtons = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    setCanScrollPrev(container.scrollLeft > 0);
    setCanScrollNext(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  // Fetch reference apps on mount
  useEffect(() => {
    const loadReferenceApps = async () => {
      try {
        setIsLoading(true);
        const apps = await getReferenceAppSummaries();
        setReferenceApps(apps);
      } catch (error) {
        console.error('Failed to fetch reference apps:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferenceApps();
  }, []);

  // Filter apps by stage
  const stageFilteredApps = useMemo(() => {
    let apps = referenceApps;

    // Filter out apps without a screenshot
    apps = apps.filter((app) => app.screenshotURL);

    if (!showAll) {
      apps = apps.filter((app) => ['alpha', 'beta', 'release'].includes(app.stage));
    }

    return sortApps(apps);
  }, [referenceApps, showAll]);

  // Build categories from filtered apps
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    categoryMap.set('All', stageFilteredApps.length);

    for (const app of stageFilteredApps) {
      for (const tag of app.tags) {
        categoryMap.set(tag, (categoryMap.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));
  }, [stageFilteredApps]);

  // Filter apps by category and search term, then sort
  const filteredApps = useMemo(() => {
    let apps = stageFilteredApps;

    // Filter by category
    if (selectedCategory !== 'All') {
      apps = apps.filter((app) => app.tags.some((tag) => tag === selectedCategory));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      apps = apps.filter((app) => app.name.toLowerCase().includes(searchLower));
    }

    // Apply sort
    const sorted = [...apps];
    if (sortBy === 'stage') {
      return sortApps(sorted);
    }
    if (sortBy === 'nameAsc') {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted.sort((a, b) => b.name.localeCompare(a.name));
  }, [selectedCategory, stageFilteredApps, searchTerm, sortBy]);

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

  return (
    <div className={classNames('w-full mx-auto', className)}>
      {/* Header - responsive layout */}
      {isSmallViewport ? (
        // Mobile header
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Start with a reference app</h1>
            <p className="text-muted-foreground truncate">
              Browse through a variety of reference applications to start with
            </p>
          </div>

          {/* Full-width search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-sm bg-transparent border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
            />
          </div>

          {/* Sort dropdown - mobile */}
          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <span className="text-muted-foreground">Sort:</span>
              <span>{referenceSortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Stage (Release first)'}</span>
              <ChevronDown
                className={classNames('w-4 h-4 transition-transform', { 'rotate-180': isSortDropdownOpen })}
              />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {referenceSortOptions.map((option) => (
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

          {/* Category dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <span>{selectedCategory}</span>
              <ChevronDown className={classNames('w-4 h-4 transition-transform', { 'rotate-180': isDropdownOpen })} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setIsDropdownOpen(false);
                    }}
                    className={classNames(
                      'w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors',
                      selectedCategory === category.name
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-foreground hover:bg-accent/50',
                    )}
                  >
                    {CATEGORY_ICONS[category.name]}
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Desktop header
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Start with a reference app</h1>
              <p className="text-muted-foreground truncate">
                Browse through a variety of reference applications to start with
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-muted-foreground">Sort By:</span>
                  <span>
                    {referenceSortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Stage (Release first)'}
                  </span>
                  <ChevronDown
                    className={classNames('w-4 h-4 transition-transform', { 'rotate-180': isSortDropdownOpen })}
                  />
                </button>

                {isSortDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {referenceSortOptions.map((option) => (
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[285px] pl-9 pr-4 py-2 text-sm bg-transparent border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
              <TabsList className="flex items-center gap-2 p-0 h-auto bg-transparent border-0 rounded-none">
                {categories.map((category) => {
                  const icon = CATEGORY_ICONS[category.name];

                  return (
                    <TabsTrigger
                      key={category.name}
                      value={category.name}
                      className={classNames(
                        'w-[142px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 border border-transparent',
                        'data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-accent/50',
                        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border',
                      )}
                    >
                      {icon}
                      <span>{category.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* Show All toggle */}
            <div
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors whitespace-nowrap flex-shrink-0',
                {
                  'bg-background text-foreground shadow-sm border border-border': showAll,
                  'bg-transparent text-foreground hover:bg-accent/50': !showAll,
                },
              )}
            >
              <Checkbox
                checked={showAll}
                onCheckedChange={(checked: boolean) => setShowAll(checked === true)}
                label="Show Hidden"
                size="sm"
              />
            </div>
          </div>
        </>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" text="Loading apps..." />
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <Search className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No apps found matching your criteria</p>
          </div>
        </div>
      ) : isSmallViewport ? (
        // Mobile carousel - wrapped to control gap between carousel and nav (match AppGallery)
        <div className="flex flex-col gap-0">
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredApps.map((app) => (
              <div key={app.name} className="flex-shrink-0 snap-start" style={{ width: 'calc(100% - 2rem)' }}>
                <ReferenceAppCard app={app} className="w-full" />
              </div>
            ))}
          </div>

          {/* Navigation arrows - only show if more than 1 card */}
          {filteredApps.length > 1 && (
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
                aria-label="Previous app"
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
                aria-label="Next app"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        // Desktop grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filteredApps.map((app) => (
            <ReferenceAppCard key={app.name} app={app} className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferenceGallery;
