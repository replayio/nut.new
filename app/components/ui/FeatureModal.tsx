import React from 'react';
import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { Check, X, ChevronRight, ChevronLeft } from '~/components/ui/Icon';
import { AppFeatureKind, AppFeatureStatus } from '~/lib/persistence/messageAppSummary';
import { formatPascalCaseName } from '~/utils/names';
import { chatStore } from '~/lib/stores/chat';
import { featureModalStore, goToNextFeature, goToPreviousFeature, closeFeatureModal } from '~/lib/stores/featureModal';
import Tests from '~/components/workbench/Preview/components/PlanView/components/Features/components/Tests';
import DefinedApis from '~/components/workbench/Preview/components/PlanView/components/Features/components/DefinedApis';
import DatabaseChanges from '~/components/workbench/Preview/components/PlanView/components/Features/components/DatabaseChanges';
import Components from '~/components/workbench/Preview/components/PlanView/components/Features/components/Components';
import Events from '~/components/workbench/Preview/components/PlanView/components/Features/components/Events';
import Pages from '../workbench/Preview/components/PlanView/components/Pages';

const FeatureModal: React.FC = () => {
  const modalState = useStore(featureModalStore);
  const appSummary = useStore(chatStore.appSummary);

  if (!modalState.isOpen || !appSummary?.features) {
    return null;
  }

  // Filter features to match the same filtering logic used in BaseChat
  const filteredFeatures = appSummary.features.filter(
    (feature) => feature.kind !== AppFeatureKind.BuildInitialApp && feature.kind !== AppFeatureKind.DesignAPIs,
  );
  const currentFeature = filteredFeatures[modalState.currentFeatureIndex];
  const hasNext = modalState.currentFeatureIndex < modalState.totalFeatures - 1;
  const hasPrevious = modalState.currentFeatureIndex > 0;

  const renderFeatureStatus = (status: AppFeatureStatus) => {
    switch (status) {
      case AppFeatureStatus.NotStarted:
        break;
      case AppFeatureStatus.ImplementationInProgress:
        return (
          <div className="flex items-center pl-2">
            <div
              className={classNames(
                'w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin shadow-sm',
              )}
            />
          </div>
        );
      case AppFeatureStatus.Implemented:
        return (
          <div className="text-green-600 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-green-50 px-2 py-1 rounded-lg border border-green-200 shadow-sm">
            <Check size={14} strokeWidth={2.5} />
            Complete
          </div>
        );
      case AppFeatureStatus.Failed:
        return (
          <div className="text-red-600 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg border border-red-200 shadow-sm">
            <X size={14} strokeWidth={2.5} />
            Failed
          </div>
        );
    }
    return null;
  };

  const handleNext = () => {
    if (hasNext) {
      goToNextFeature();
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      goToPreviousFeature();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFeatureModal();
    }
  };

  if (!currentFeature) {
    return null;
  }

  const name = formatPascalCaseName(currentFeature.name);
  const description = currentFeature.description;
  const status = currentFeature.status;

  return (
    <AnimatePresence>
      {modalState.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl mx-4 max-h-[90vh] bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
              <div className="flex items-center gap-4">
                {/* Feature Info */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-bolt-elements-textHeading">{name}</h2>
                  <p className="text-bolt-elements-textSecondary mt-1">{description}</p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">{renderFeatureStatus(status)}</div>
              </div>

              {/* Close Button */}
              <button
                onClick={closeFeatureModal}
                className="p-2 rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-all duration-200 flex items-center justify-center"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content with Navigation */}
            <div className="flex items-center">
              {/* Left Navigation Button */}
              {hasPrevious && (
                <button
                  onClick={handlePrevious}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor shadow-lg transition-all duration-200 flex items-center justify-center opacity-50 hover:opacity-100 hover:shadow-xl cursor-pointer ml-2.5"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
              )}

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-120px)] ">
                <div className="space-y-6">
                  {currentFeature.databaseChange &&
                    currentFeature.databaseChange.tables &&
                    currentFeature.databaseChange.tables.length > 0 && <DatabaseChanges feature={currentFeature} />}

                  {currentFeature.componentNames && currentFeature.componentNames.length > 0 && (
                    <Components summary={appSummary} feature={currentFeature} />
                  )}

                  {currentFeature.definedAPIs && currentFeature.definedAPIs.length > 0 && (
                    <DefinedApis feature={currentFeature} />
                  )}

                  {currentFeature.tests && currentFeature.tests.length > 0 && (
                    <Tests featureTests={currentFeature.tests} />
                  )}

                  <Events featureName={currentFeature.name} />

                  {currentFeature.kind === 'BuildMockup' && (
                    <>
                      <Pages />
                      <Events featureName={undefined} />
                    </>
                  )}
                </div>
              </div>

              {/* Right Navigation Button */}
              {hasNext && (
                <button
                  onClick={handleNext}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor shadow-lg transition-all duration-200 flex items-center justify-center opacity-50 hover:opacity-100 hover:shadow-xl cursor-pointer mr-2.5"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Footer with feature counter */}
            <div className="px-6 py-4 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-bolt-elements-textSecondary">
                  Feature {modalState.currentFeatureIndex + 1} of {modalState.totalFeatures}
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: modalState.totalFeatures }, (_, index) => (
                    <div
                      key={index}
                      className={classNames(
                        'w-2 h-2 rounded-full transition-all duration-200',
                        index === modalState.currentFeatureIndex
                          ? 'bg-bolt-elements-textPrimary'
                          : 'bg-bolt-elements-borderColor',
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeatureModal;
