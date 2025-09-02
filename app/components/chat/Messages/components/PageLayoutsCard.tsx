import React from 'react';
import { AppCard } from './AppCard';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { formatPascalCaseName } from '~/utils/names';

interface PageLayoutsCardProps {
  appSummary: AppSummary;
  onViewDetails: () => void;
}

export const PageLayoutsCard: React.FC<PageLayoutsCardProps> = ({ appSummary, onViewDetails }) => {
  const pages = appSummary.pages || [];

  const getDescription = () => {
    if (pages.length === 0) {
      return 'No pages defined yet';
    }

    const pageNames = pages
      .slice(0, 3)
      .map((page) => formatPascalCaseName(page.name || ''))
      .join(', ');
    const remaining = pages.length - 3;

    if (remaining > 0) {
      return `${pageNames} and ${remaining} more page${remaining === 1 ? '' : 's'}`;
    }

    return pageNames;
  };

  const getPagesList = () => {
    if (pages.length === 0) {
      return null;
    }

    const displayPages = pages.slice(0, 5);
    const hasMore = pages.length > 5;

    return (
      <div className="space-y-2">
        {displayPages.map((page, index) => (
          <div key={index} className="flex items-center gap-2 py-1">
            <div className="i-ph:layout text-bolt-elements-textSecondary text-sm flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-bolt-elements-textPrimary truncate">
                {formatPascalCaseName(page.name || `Page ${index + 1}`)}
              </div>
              {page.components && page.components.length > 0 && (
                <div className="text-xs text-bolt-elements-textSecondary">
                  {page.components.length} component{page.components.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-bolt-elements-background-depth-1 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 py-1 text-xs text-bolt-elements-textSecondary">
              <div className="i-ph:dots-three text-sm flex-shrink-0" />
              <span>
                and {pages.length - 5} more page{pages.length - 5 === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppCard
      title="Page Layouts"
      description={getDescription()}
      icon={<div className="i-ph:layout-duotone text-white text-lg" />}
      iconColor="orange"
      status={pages.length > 0 ? 'completed' : 'pending'}
      progressText={pages.length > 0 ? 'Designed' : 'Pending'}
      onClick={onViewDetails}
    >
      {getPagesList()}
    </AppCard>
  );
};
