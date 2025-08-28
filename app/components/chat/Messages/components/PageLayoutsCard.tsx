import React from 'react';
import { AppCard } from './AppCard';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { formatPascalCaseName } from '~/utils/names';

interface PageLayoutsCardProps {
  appSummary: AppSummary;
  onViewDetails: () => void;
}

export const PageLayoutsCard: React.FC<PageLayoutsCardProps> = ({ 
  appSummary, 
  onViewDetails 
}) => {
  const pages = appSummary.pages || [];
  const totalComponents = pages.reduce((total, page) => total + (page.components?.length || 0), 0);

  const getDescription = () => {
    if (pages.length === 0) {
      return 'No pages defined yet';
    }
    
    const pageNames = pages.slice(0, 3).map(page => formatPascalCaseName(page.name || '')).join(', ');
    const remaining = pages.length - 3;
    
    if (remaining > 0) {
      return `${pageNames} and ${remaining} more page${remaining === 1 ? '' : 's'}`;
    }
    
    return pageNames;
  };

  const getSummaryStats = () => {
    if (pages.length === 0) return null;
    
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
          <div className="text-base font-semibold text-bolt-elements-textPrimary">{pages.length}</div>
          <div className="text-xs text-bolt-elements-textSecondary">Page{pages.length === 1 ? '' : 's'}</div>
        </div>
        <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
          <div className="text-base font-semibold text-bolt-elements-textPrimary">{totalComponents}</div>
          <div className="text-xs text-bolt-elements-textSecondary">Component{totalComponents === 1 ? '' : 's'}</div>
        </div>
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
      {getSummaryStats()}
    </AppCard>
  );
};
