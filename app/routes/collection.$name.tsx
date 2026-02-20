import { json, type LoaderFunctionArgs, type MetaFunction } from '~/lib/remix-types';
import { Link, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import type { CollectionPageContent, ReferenceAppSummary } from '~/lib/replay/ReferenceApps';
import { getCollectionPageContent, getCollections, getReferenceAppSummaries } from '~/lib/replay/ReferenceApps';
import { classNames } from '~/utils/classNames';
import { Menu } from '~/components/sidebar/Menu.client';
import { Header } from '~/components/header/Header';
import useViewport from '~/lib/hooks';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { useStore } from '@nanostores/react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';

export const meta: MetaFunction = () => {
  return [{ title: 'Collection | Replay Builder' }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const name = params.name ? decodeURIComponent(params.name) : null;
  if (!name) {
    return json({ error: 'Collection name is required' }, { status: 400 });
  }

  try {
    const collections = await getCollections();
    const collection = collections.find((c) => c.name === name);

    if (!collection) {
      return json({ error: 'Collection not found' }, { status: 404 });
    }

    return json({ collection });
  } catch (error) {
    console.error('Failed to load collection:', error);
    return json({ error: 'Failed to load collection' }, { status: 500 });
  }
}

// Loading skeleton
const LoadingSkeleton: React.FC<{ isSmallViewport?: boolean; isSidebarCollapsed?: boolean }> = ({
  isSmallViewport = false,
  isSidebarCollapsed = false,
}) => (
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
      <div className="bg-card border border-border rounded-md overflow-hidden animate-fade-in">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center gap-6 py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-border border-t-foreground animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">Loading collection...</p>
              <p className="text-sm text-muted-foreground">Preparing collection details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function CollectionPageContent() {
  const { collection: loaderCollection } = useLoaderData<typeof loader>();
  const [collectionContent, setCollectionContent] = useState<CollectionPageContent | null>(null);
  const [referenceApps, setReferenceApps] = useState<ReferenceAppSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSmallViewport = useViewport(1024);
  const isSidebarCollapsed = useStore(sidebarMenuStore.isCollapsed);

  // Load collection content and reference apps
  useEffect(() => {
    if (!loaderCollection) {
      setError('Collection not found');
      setIsLoading(false);
      return;
    }

    const loadCollectionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load reference apps
        const apps = await getReferenceAppSummaries();
        setReferenceApps(apps);

        // Load collection content
        try {
          const content = await getCollectionPageContent(loaderCollection.collectionPath);
          setCollectionContent(content);
        } catch (err) {
          console.error('Failed to fetch collection content:', err);
          // Continue with index data if content fetch fails
        } finally {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load collection data:', err);
        setError('Failed to load collection data');
        setIsLoading(false);
      }
    };

    loadCollectionData();
  }, [loaderCollection]);

  const handleAppClick = (app: ReferenceAppSummary) => {
    const encodedName = encodeURIComponent(app.name);
    window.location.href = `/gallery/${encodedName}`;
  };

  if (isLoading || !loaderCollection) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-card">
        <Menu />
        <div className="flex-1 flex flex-col overflow-hidden">
          {isSmallViewport && <Header />}
          <div className="flex-1 overflow-y-auto">
            <LoadingSkeleton isSmallViewport={isSmallViewport} isSidebarCollapsed={isSidebarCollapsed} />
          </div>
        </div>
      </div>
    );
  }

  // Ensure displayData is available
  const displayData = collectionContent || loaderCollection;

  // Error or fallback state
  if (error || !collectionContent) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-card">
        {/* Sidebar - Desktop only */}
        {!isSmallViewport && <Menu />}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Mobile only */}
          {isSmallViewport && <Header />}

          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            {/* Top bar with breadcrumbs */}
            <div
              className={classNames(
                'sticky top-0 z-10 bg-card border-b border-border py-3 sm:py-4 transition-all duration-300',
                !isSmallViewport
                  ? isSidebarCollapsed
                    ? 'md:pl-[calc(60px+1.5rem)] md:pr-6'
                    : 'md:pl-[calc(260px+1.5rem)] md:pr-6'
                  : 'px-4 sm:px-6',
              )}
            >
              <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 min-w-0">
                {/* Breadcrumbs */}
                <Breadcrumb className="min-w-0 flex-shrink">
                  <BreadcrumbList className="text-sm">
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to="/"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Home
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>
                      <span className="text-muted-foreground">/</span>
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-foreground font-medium truncate">
                        {loaderCollection.name}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>

            {/* Content */}
            <div
              className={classNames(
                'max-w-7xl mx-auto sm:py-8 transition-all duration-300',
                !isSmallViewport
                  ? isSidebarCollapsed
                    ? 'md:pl-[calc(60px+1.5rem)] md:pr-6'
                    : 'md:pl-[calc(260px+1.5rem)] md:pr-6'
                  : 'sm:px-6',
              )}
            >
              <div className="bg-card border border-border rounded-md overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="relative p-6 border-b border-border">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        {loaderCollection.name}
                      </h2>
                      <p className="text-muted-foreground">{loaderCollection.shortDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {error && (
                    <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}. Showing basic information instead.
                    </div>
                  )}

                  <div className="text-center py-12 text-muted-foreground">
                    <p>Unable to load collection details.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-card">
      {/* Sidebar */}
      <Menu />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Mobile only */}
        {isSmallViewport && <Header />}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top bar with breadcrumbs */}
          <div
            className={classNames(
              'sticky top-0 z-10 bg-card border-b border-border py-3 sm:py-4 transition-all duration-300',
              !isSmallViewport
                ? isSidebarCollapsed
                  ? 'md:pl-[calc(60px+1.5rem)] md:pr-6'
                  : 'md:pl-[calc(260px+1.5rem)] md:pr-6'
                : 'px-4 sm:px-6',
            )}
          >
            <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 min-w-0">
              {/* Breadcrumbs */}
              <Breadcrumb className="min-w-0 flex-shrink">
                <BreadcrumbList className="text-sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <span className="text-muted-foreground">/</span>
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Collection
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <span className="text-muted-foreground">/</span>
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-medium truncate">
                      {displayData.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Content */}
          <div
            className={classNames(
              'max-w-7xl mx-auto sm:py-8 transition-all duration-300',
              !isSmallViewport
                ? isSidebarCollapsed
                  ? 'md:pl-[calc(60px+1.5rem)] md:pr-6'
                  : 'md:pl-[calc(260px+1.5rem)] md:pr-6'
                : 'sm:px-6',
            )}
          >
            <div className="bg-card border border-border rounded-md overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="relative p-6 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">{displayData.name}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {displayData.shortDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Long Description */}
                {collectionContent?.longDescription && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">About this collection</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {collectionContent.longDescription}
                    </p>
                  </div>
                )}

                {/* Apps in Collection */}
                {collectionContent?.apps && collectionContent.apps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Apps in this collection ({collectionContent.apps.length})
                    </h3>
                    <div className="space-y-4">
                      {collectionContent.apps.map((collectionApp, index) => {
                        // Find the matching reference app from the full list
                        const matchingApp = referenceApps.find(
                          (app) => app.referenceAppPath === collectionApp.referenceAppPath,
                        );

                        if (!matchingApp) {
                          return null;
                        }

                        return (
                          <button
                            key={index}
                            onClick={() => handleAppClick(matchingApp)}
                            className="w-full text-left group bg-card rounded-md p-5 border border-border hover:bg-muted transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              {matchingApp.screenshotURL && (
                                <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-border">
                                  <img
                                    src={matchingApp.screenshotURL}
                                    alt={matchingApp.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-base font-semibold text-foreground mb-1.5 group-hover:text-foreground transition-colors">
                                  {matchingApp.name}
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {collectionApp.description || matchingApp.shortDescription}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(!collectionContent?.apps || collectionContent.apps.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No apps found in this collection.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionRoute() {
  return <ClientOnly fallback={<LoadingSkeleton />}>{() => <CollectionPageContent />}</ClientOnly>;
}
