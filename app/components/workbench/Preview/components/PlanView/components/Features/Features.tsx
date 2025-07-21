import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { AppFeatureStatus, type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Tests from './components/Tests';
import DefinedApis from './components/DefinedApis';
import DatabaseChanges from './components/DatabaseChanges';
import { motion, AnimatePresence } from 'framer-motion';

interface FeaturesProps {
  appSummary: AppSummary | null;
}

const Features = ({ appSummary }: FeaturesProps) => {
  const [collapsedFeatures, setCollapsedFeatures] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (appSummary?.features) {
      setCollapsedFeatures(new Set(appSummary.features.map((_, index) => index)));
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

  const renderFeatureStatus = (feature: AppFeature) => {
    switch (feature.status) {
      case AppFeatureStatus.NotStarted:
        break;
      case AppFeatureStatus.ImplementationInProgress:
        return (
          <div
            className={classNames(
              'w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin',
            )}
          />
        );
      case AppFeatureStatus.Implemented:
        return <div className="text-gray-500 text-sm font-medium whitespace-nowrap">✓ Implemented</div>;
      case AppFeatureStatus.ValidationInProgress:
        return <div className="text-gray-500 text-sm font-medium whitespace-nowrap">✓ Implemented, testing...</div>;
      case AppFeatureStatus.Validated:
        return <div className="text-green-500 text-sm font-medium whitespace-nowrap">✓ Tests Pass</div>;
      case AppFeatureStatus.ValidationFailed:
        return <div className="text-red-500 text-sm font-medium whitespace-nowrap">✗ Failed</div>;
    }
    return null;
  };

  return (
    <div>
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-bolt-elements-textPrimary">Features</div>
          </div>

          <div className="space-y-6">
            {appSummary?.features?.map((feature, index) => {
              const isCollapsed = collapsedFeatures.has(index);

              return (
                <div
                  key={index}
                  className="rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor overflow-hidden"
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
                        <div className="text-bolt-elements-textPrimary text-base font-bold">{feature.name}</div>
                        <div className="flex-1 flex items-center group text-bolt-elements-textSecondary">
                          <span className="flex-1">{feature.description}</span>
                        </div>
                      </div>
                    </div>

                    {renderFeatureStatus(feature)}
                  </div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        {feature.databaseChange &&
                          feature.databaseChange.tables &&
                          feature.databaseChange.tables.length > 0 && <DatabaseChanges feature={feature} />}

                        {feature.definedAPIs && feature.definedAPIs.length > 0 && <DefinedApis feature={feature} />}
                        {feature.tests && feature.tests.length > 0 && <Tests featureTests={feature.tests} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
