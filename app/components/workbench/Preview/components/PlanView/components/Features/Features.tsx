import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { AppFeatureStatus, type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Tests from './components/Tests';
import DefinedApis from './components/DefinedApis';
import DatabaseChanges from './components/DatabaseChanges';
import Components from './components/Components';
import Events from './components/Events';
import { motion, AnimatePresence } from 'framer-motion';

interface FeaturesProps {
  appSummary: AppSummary | null;
}

const MockupFeatureIndex = -1;

const Features = ({ appSummary }: FeaturesProps) => {
  const [collapsedFeatures, setCollapsedFeatures] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (appSummary?.features) {
      setCollapsedFeatures(new Set([MockupFeatureIndex, ...appSummary.features.map((_, index) => index)]));
    }
  }, [appSummary]);

  const toggleFeatureCollapse = (featureIndex: number) => {
    setCollapsedFeatures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(featureIndex)) {
        newSet.delete(featureIndex);
      } else {
        newSet.add(featureIndex);
      }
      return newSet;
    });
  };

  const renderFeatureStatus = (status: AppFeatureStatus) => {
    switch (status) {
      case AppFeatureStatus.NotStarted:
        break;
      case AppFeatureStatus.ImplementationInProgress:
        return (
          <div
            className={classNames(
              'min-w-4 min-h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin',
            )}
          />
        );
      case AppFeatureStatus.Implemented:
        return (
          <div className="text-gray-500 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-1">
            <div className="i-ph:check-bold" />
            Implemented
          </div>
        );
      case AppFeatureStatus.ValidationInProgress:
        return (
          <div className="text-gray-500 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-1">
            <div className="i-ph:spinner-gap-fill animate-spin" />
            Testing...
          </div>
        );
      case AppFeatureStatus.Validated:
        return (
          <div className="text-green-500 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-1">
            <div className="i-ph:check-bold" />
            Tests Passed
          </div>
        );
      case AppFeatureStatus.ValidationFailed:
        return (
          <div className="text-red-500 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-1">
            <div className="i-ph:x-bold" />
            Failed
          </div>
        );
    }
    return null;
  };

  // Render a feature, or undefined for the mockup.
  const renderFeature = (feature: AppFeature | undefined, index: number) => {
    const isCollapsed = collapsedFeatures.has(index);

    const name = feature ? feature.name : 'Mockup';
    const description = feature
      ? feature.description
      : 'Builds a mockup of the app with a complete UI but no functionality.';
    const status = feature ? feature.status : (appSummary?.mockupStatus ?? AppFeatureStatus.NotStarted);

    return (
      <div
        key={index}
        className="rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor overflow-hidden mb-4 mt-1"
      >
        <div
          onClick={() => toggleFeatureCollapse(index)}
          className="flex justify-between items-center p-3 border-b border-bolt-elements-borderColor cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              {isCollapsed ? (
                <div className="i-ph:caret-down text-bolt-elements-textPrimary text-base font-bold" />
              ) : (
                <div className="i-ph:caret-up text-bolt-elements-textPrimary text-base font-bold" />
              )}
            </div>

            <div className="gap-2">
              <div className="text-bolt-elements-textPrimary text-base font-bold">{name}</div>
              <div className="flex-1 flex items-center group text-bolt-elements-textSecondary">
                <span className="flex-1">{description}</span>
              </div>
            </div>
          </div>

          {renderFeatureStatus(status)}
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {feature?.databaseChange && feature.databaseChange.tables && feature.databaseChange.tables.length > 0 && (
                <DatabaseChanges feature={feature} />
              )}

              {feature?.componentNames && feature.componentNames.length > 0 && (
                <Components summary={appSummary!} feature={feature} />
              )}
              {feature?.definedAPIs && feature.definedAPIs.length > 0 && <DefinedApis feature={feature} />}
              {feature?.tests && feature.tests.length > 0 && <Tests featureTests={feature.tests} />}
              <Events featureName={feature?.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="mb-8">
      {appSummary?.mockupStatus && renderFeature(undefined, MockupFeatureIndex)}

      {appSummary?.features && appSummary?.features.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-bolt-elements-textPrimary">Features</div>
        </div>
      )}

      <div className="space-y-6">{appSummary?.features?.map((feature, index) => renderFeature(feature, index))}</div>
    </div>
  );
};

export default Features;
