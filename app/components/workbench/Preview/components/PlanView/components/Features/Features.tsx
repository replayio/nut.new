import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { ChatMode } from '~/lib/replay/ChatManager';
import { type AppFeature, AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';
import { AddFeatureInput } from '~/components/workbench/Preview/components/PlanView/components/AddFeatureInput';
import Tests from './components/Tests';
import DefinedApis from './components/DefinedApis';
import DatabaseChanges from './components/DatabaseChanges';

interface FeaturesProps {
  appSummary: AppSummary | null;
  handleSendMessage?: (event: React.UIEvent, messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => void;
  setActiveTab?: (tab: 'planning' | 'preview') => void;
}

const Features = ({ appSummary, handleSendMessage, setActiveTab }: FeaturesProps) => {
  // State to track selected features (using Set for efficient lookups)
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  console.log('appSummary', appSummary);

  // State for additional features added by user
  const [additionalFeatures, setAdditionalFeatures] = useState<Array<AppFeature>>([]);

  // State for editing features
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [featureOverrides, setFeatureOverrides] = useState<Record<number, AppFeature>>({});

  // Combine original features with additional features, applying overrides
  const allFeatures: AppFeature[] = [
    ...(appSummary?.features || []).map((feature, index) => featureOverrides[index] || feature),
    ...additionalFeatures,
  ];

  // Select all features by default when appSummary becomes available
  useEffect(() => {
    if (appSummary?.features) {
      setSelectedFeatures(new Set(appSummary.features.map((_, index) => index)));
    }
  }, [appSummary]);

  // Update selected features when additional features are added
  useEffect(() => {
    if (additionalFeatures.length > 0) {
      setSelectedFeatures((prev) => {
        const newSet = new Set(prev);
        // Add the new feature indices to selected features
        for (let i = appSummary?.features?.length || 0; i < allFeatures.length; i++) {
          newSet.add(i);
        }
        return newSet;
      });
    }
  }, [additionalFeatures.length, appSummary?.features?.length, allFeatures.length]);

  // Handle adding new features
  const handleAddFeature = (featureDescription: string) => {
    const newFeature = {
      description: featureDescription,
      status: AppFeatureStatus.NotStarted,
      name: '',
      summary: '',
    };
    setAdditionalFeatures((prev) => [...prev, newFeature]);
  };

  // Toggle feature selection
  const toggleFeatureSelection = (featureIndex: number) => {
    setSelectedFeatures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(featureIndex)) {
        newSet.delete(featureIndex);
      } else {
        newSet.add(featureIndex);
      }
      return newSet;
    });
  };

  // Handle editing features
  const handleEditFeature = (featureIndex: number, newDescription: string) => {
    const originalFeaturesLength = appSummary?.features?.length || 0;

    if (featureIndex < originalFeaturesLength) {
      // Editing an original feature - use override
      setFeatureOverrides((prev) => ({
        ...prev,
        [featureIndex]: {
          name: appSummary?.features?.[featureIndex]?.name ?? '',
          summary: appSummary?.features?.[featureIndex]?.summary ?? '',
          description: newDescription,
          status: appSummary?.features?.[featureIndex]?.status ?? AppFeatureStatus.NotStarted,
        },
      }));
    } else {
      // Editing an additional feature
      const additionalIndex = featureIndex - originalFeaturesLength;
      setAdditionalFeatures((prev) =>
        prev.map((feature, index) =>
          index === additionalIndex ? { ...feature, description: newDescription } : feature,
        ),
      );
    }

    setEditingFeatureIndex(null);
    setEditingValue('');
  };

  const startEditing = (featureIndex: number, currentDescription: string) => {
    setEditingFeatureIndex(featureIndex);
    setEditingValue(currentDescription);
  };

  const cancelEditing = () => {
    setEditingFeatureIndex(null);
    setEditingValue('');
  };

  return (
    <div>
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-bolt-elements-textPrimary">Features</div>
            <div className="text-sm text-bolt-elements-textSecondary">
              {selectedFeatures.size} of {allFeatures.length} selected
            </div>
          </div>

          <div className="space-y-6">
            {allFeatures.map((feature, index) => {
              const done = feature.status === AppFeatureStatus.Done;

              return (
                <div
                  key={index}
                  className="rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 border-b border-bolt-elements-borderColor">
                    <button
                      onClick={() => toggleFeatureSelection(index)}
                      className={classNames(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        {
                          'border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1':
                            !selectedFeatures.has(index),
                          'border-blue-500 bg-blue-500 hover:bg-blue-600': selectedFeatures.has(index),
                        },
                      )}
                    >
                      {selectedFeatures.has(index) && <div className="i-ph:check-bold text-white text-sm" />}
                    </button>

                    {editingFeatureIndex === index ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-bolt-elements-borderColor rounded bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditFeature(index, editingValue);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditFeature(index, editingValue)}
                          className="bg-transparent text-green-500 hover:text-green-600 text-sm"
                        >
                          <div className="i-ph:check-bold" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-transparent text-red-500 hover:text-red-600 text-sm"
                        >
                          <div className="i-ph:x-bold" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={classNames('flex-1 flex items-center group cursor-pointer', {
                          'text-bolt-elements-textSecondary': !done,
                          'text-bolt-elements-textPrimary': done,
                        })}
                        onClick={() => startEditing(index, feature.description)}
                      >
                        <span className="flex-1">{feature.description}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 bg-transparent hover:bg-transparent">
                          <div className="i-ph:pencil-simple text-xl text-bolt-elements-textPrimary" />
                        </button>
                      </div>
                    )}

                    {done ? (
                      <div className="text-green-500 text-sm font-medium">✓ Complete</div>
                    ) : feature.status === AppFeatureStatus.InProgress ? (
                      <div
                        className={classNames(
                          'w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin',
                        )}
                      />
                    ) : null}
                  </div>

                  {feature.databaseChange &&
                    feature.databaseChange.tables &&
                    feature.databaseChange.tables.length > 0 && <DatabaseChanges feature={feature} />}

                  {feature.definedAPIs && feature.definedAPIs.length > 0 && <DefinedApis feature={feature} />}
                  {feature.tests && feature.tests.length > 0 && <Tests featureTests={feature.tests} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex w-full sticky left-0 bottom-[125px] p-4  justify-center items-center">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
          onClick={(e) => {
            if (!appSummary) {
              return;
            }

            const selectedFeaturesArray = Array.from(selectedFeatures).sort((a, b) => a - b);
            const filteredFeatures = selectedFeaturesArray.map((index) => allFeatures[index]);

            const filteredAppSummary = {
              ...appSummary,
              features: filteredFeatures,
            };

            handleSendMessage?.(e, JSON.stringify(filteredAppSummary), true, ChatMode.DevelopApp);
            setActiveTab?.('preview');
          }}
        >
          <div className="i-ph:rocket-launch text-xl"></div>
          Develop App
        </button>
      </div>
      <div className=" w-full sticky left-0 bottom-[-25px] bg-bolt-elements-background-depth-1 p-4 border-t border-bolt-elements-borderColor shadow-lg">
        <AddFeatureInput onAddFeature={handleAddFeature} />
      </div>
    </div>
  );
};

export default Features;
