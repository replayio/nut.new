import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { AppFeatureStatus, type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Tests from './components/Tests';
import DefinedApis from './components/DefinedApis';
import DatabaseChanges from './components/DatabaseChanges';
import Components from './components/Components';
import Events from './components/Events';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPascalCaseName } from '~/utils/names';

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
          <div className="text-gray-500 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 shadow-sm">
            <div className="i-ph:check-bold" />
            Implemented
          </div>
        );
      case AppFeatureStatus.ValidationInProgress:
        return (
          <div className="text-blue-600 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 shadow-sm">
            <div className="i-ph:spinner-gap-fill animate-spin" />
            Testing...
          </div>
        );
      case AppFeatureStatus.Validated:
        return (
          <div className="text-green-600 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-green-50 px-2 py-1 rounded-lg border border-green-200 shadow-sm">
            <div className="i-ph:check-bold" />
            Tests Passed
          </div>
        );
      case AppFeatureStatus.ValidationFailed:
        return (
          <div className="text-red-600 text-sm font-medium whitespace-nowrap pl-2 flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg border border-red-200 shadow-sm">
            <div className="i-ph:x-bold" />
            Failed
          </div>
        );
    }
    return null;
  };

  const renderFeature = (feature: AppFeature | undefined, index: number) => {
    const isCollapsed = collapsedFeatures.has(index);

    const name = feature ? formatPascalCaseName(feature.name) : 'Mockup';
    const description = feature
      ? feature.description
      : 'Builds a mockup of the app with a complete UI but no functionality.';
    const status = feature ? feature.status : (appSummary?.mockupStatus ?? AppFeatureStatus.NotStarted);

    return (
      <div
        key={index}
        className="rounded-xl bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor overflow-hidden mb-4 mt-1 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group"
      >
        <div
          onClick={() => toggleFeatureCollapse(index)}
          className="flex justify-between items-center p-4 border-b border-bolt-elements-borderColor/50 cursor-pointer hover:bg-bolt-elements-background-depth-2/30 transition-all duration-200"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105">
              {isCollapsed ? (
                <div className="i-ph:caret-down text-bolt-elements-textPrimary text-base font-bold transition-transform duration-200 group-hover:scale-110" />
              ) : (
                <div className="i-ph:caret-up text-bolt-elements-textPrimary text-base font-bold transition-transform duration-200 group-hover:scale-110" />
              )}
            </div>

            <div className="gap-2 min-w-0 flex-1">
              <div className="text-bolt-elements-textHeading text-base font-bold">{formatPascalCaseName(name)}</div>
              <div className="flex items-center group text-bolt-elements-textSecondary min-w-0">
                <span>{description}</span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">{renderFeatureStatus(status)}</div>
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
        <div className="flex items-center gap-3 p-4 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor/30 shadow-sm mb-6">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
            <div className="i-ph:puzzle-piece-duotone text-white text-lg"></div>
          </div>
          <div className="text-lg font-semibold text-bolt-elements-textHeading">Features</div>
        </div>
      )}

      <div className="space-y-6">{appSummary?.features?.map((feature, index) => renderFeature(feature, index))}</div>
    </div>
  );
};

export default Features;
