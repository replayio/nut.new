import React from 'react';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import { type AppSummary, type AppFeature, AppFeatureStatus } from '~/lib/persistence/messageAppSummary';

// Import existing PlanView components
import Features from '~/components/workbench/Preview/components/PlanView/components/Features/Features';
import Events from '~/components/workbench/Preview/components/PlanView/components/Features/components/Events';
import Pages from '~/components/workbench/Preview/components/PlanView/components/Pages';
import Secrets from '~/components/workbench/Preview/components/PlanView/components/Secrets';
import AuthSelector from '~/components/workbench/Preview/components/PlanView/components/AuthSelector';

type ModalType = 
  | 'project-description'
  | 'features'
  | 'mockup'
  | 'pages'
  | 'secrets'
  | 'auth';

interface AppCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  appSummary: AppSummary;
  feature?: AppFeature;
}

export const AppCardModal: React.FC<AppCardModalProps> = ({
  isOpen,
  onClose,
  type,
  appSummary,
  feature,
}) => {
  const getModalTitle = () => {
    switch (type) {
      case 'project-description':
        return 'Project Overview';
      case 'features':
        return 'Features';
      case 'mockup':
        return 'Mockup Details';
      case 'pages':
        return 'Page Layouts';
      case 'secrets':
        return 'Secrets Configuration';
      case 'auth':
        return 'Authentication Settings';
      default:
        return 'Details';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'project-description':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-bolt-elements-background-depth-2/50 rounded-xl border border-bolt-elements-borderColor/50">
              <div className="text-lg font-semibold mb-3 text-bolt-elements-textHeading">Project Description</div>
              <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary.description}</div>
              
              {appSummary.features && appSummary.features.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-bolt-elements-textSecondary mb-2">
                    <span><b>PROGRESS:</b></span>
                    <span>
                      {appSummary.features.filter(f => f.status === AppFeatureStatus.Validated).length} / {appSummary.features.length} features complete
                    </span>
                  </div>
                  <div className="w-full h-3 bg-bolt-elements-background-depth-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                      style={{
                        width: `${(appSummary.features.filter(f => f.status === AppFeatureStatus.Validated).length / appSummary.features.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'features':
        return <Features />;

      case 'mockup':
        return <Events featureName={undefined} />;

      case 'pages':
        return <Pages />;

      case 'secrets':
        return <Secrets />;

      case 'auth':
        return <AuthSelector />;

      default:
        return (
          <div className="p-6 text-center text-bolt-elements-textSecondary">
            No details available
          </div>
        );
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog onClose={onClose} className="max-w-4xl">
        <TooltipProvider>
          <div className="bg-bolt-elements-background-depth-1 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden">
            
                       <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-12 py-12">
              <div className="mb-4">
                {renderContent()}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </Dialog>
    </DialogRoot>
  );
};
