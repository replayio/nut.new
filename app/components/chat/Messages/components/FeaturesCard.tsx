import React from 'react';
import { AppCard } from './AppCard';
import { AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';

interface FeaturesCardProps {
  appSummary: AppSummary;
  onViewDetails: () => void;
}

export const FeaturesCard: React.FC<FeaturesCardProps> = ({ appSummary, onViewDetails }) => {
  const features = appSummary.features || [];
  
  const getStatusCounts = () => {
    const counts = {
      completed: 0,
      inProgress: 0,
      failed: 0,
      pending: 0,
    };

    features.forEach((feature) => {
      switch (feature.status) {
        case AppFeatureStatus.Validated:
          counts.completed++;
          break;
        case AppFeatureStatus.ImplementationInProgress:
        case AppFeatureStatus.Implemented:
        case AppFeatureStatus.ValidationInProgress:
          counts.inProgress++;
          break;
        case AppFeatureStatus.ValidationFailed:
          counts.failed++;
          break;
        default:
          counts.pending++;
          break;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const totalFeatures = features.length;

  const getOverallStatus = () => {
    if (totalFeatures === 0) {
      return {
        status: 'pending' as const,
        progressText: 'No features planned',
      };
    }

    if (statusCounts.failed > 0) {
      return {
        status: 'failed' as const,
        progressText: `${statusCounts.failed} failed, ${statusCounts.completed}/${totalFeatures} complete`,
      };
    }

    if (statusCounts.completed === totalFeatures) {
      return {
        status: 'completed' as const,
        progressText: 'All features completed',
      };
    }

    if (statusCounts.inProgress > 0) {
      return {
        status: 'in-progress' as const,
        progressText: `${statusCounts.inProgress} in progress, ${statusCounts.completed}/${totalFeatures} complete`,
      };
    }

    return {
      status: 'pending' as const,
      progressText: `${statusCounts.completed}/${totalFeatures} complete`,
    };
  };

  const overallStatus = getOverallStatus();

  const getDescription = () => {
    // Use project description from appSummary as primary description
    if (appSummary.description) {
      return appSummary.description;
    }

    if (totalFeatures === 0) {
      return 'No features have been planned for this application yet.';
    }

    const featureNames = features.slice(0, 3).map(f => f.name).join(', ');
    const remaining = totalFeatures - 3;
    
    if (remaining > 0) {
      return `${featureNames} and ${remaining} more feature${remaining === 1 ? '' : 's'}`;
    }
    
    return featureNames;
  };

  const getContent = () => {
    // If no features, don't show progress/stats content
    if (totalFeatures === 0) return null;

    const totalComponents = features.reduce((total, f) => total + (f.componentNames?.length || 0), 0);
    const totalAPIs = features.reduce((total, f) => total + (f.definedAPIs?.length || 0), 0);
    const totalTests = features.reduce((total, f) => total + (f.tests?.length || 0), 0);

    return (
      <div className="space-y-3">
        {/* Overall Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-bolt-elements-textSecondary">
            <span>Progress</span>
            <span>{statusCounts.completed} / {totalFeatures} complete</span>
          </div>
          <div className="w-full h-1.5 bg-bolt-elements-background-depth-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-bolt-elements-focus to-bolt-elements-focus/80 transition-all duration-1000"
              style={{
                width: `${totalFeatures > 0 ? (statusCounts.completed / totalFeatures) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Feature Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
            <div className="text-base font-semibold text-bolt-elements-textPrimary">{totalFeatures}</div>
            <div className="text-xs text-bolt-elements-textSecondary">Feature{totalFeatures === 1 ? '' : 's'}</div>
          </div>
          <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
            <div className="text-base font-semibold text-bolt-elements-textPrimary">{totalComponents}</div>
            <div className="text-xs text-bolt-elements-textSecondary">Component{totalComponents === 1 ? '' : 's'}</div>
          </div>
          {(totalAPIs > 0 || totalTests > 0) && (
            <>
              {totalAPIs > 0 && (
                <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
                  <div className="text-base font-semibold text-bolt-elements-textPrimary">{totalAPIs}</div>
                  <div className="text-xs text-bolt-elements-textSecondary">API{totalAPIs === 1 ? '' : 's'}</div>
                </div>
              )}
              {totalTests > 0 && (
                <div className="text-center p-2 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
                  <div className="text-base font-semibold text-bolt-elements-textPrimary">{totalTests}</div>
                  <div className="text-xs text-bolt-elements-textSecondary">Test{totalTests === 1 ? '' : 's'}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Show card if there are features OR if there's a project description
  if (totalFeatures === 0 && !appSummary.description) {
    return null;
  }

  return (
    <AppCard
      title="Features"
      description={getDescription()}
      icon={<div className="i-ph:puzzle-piece-duotone text-white text-lg" />}
      iconColor="green"
      status={overallStatus.status}
      progressText={overallStatus.progressText}
      onClick={onViewDetails}
    >
      {getContent()}
    </AppCard>
  );
};
