import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { ChatMode } from '~/lib/replay/ChatManager';
import { type AppFeature, AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';
import { AddFeatureInput } from './AddFeatureInput';

interface PlanningViewProps {
  appSummary: AppSummary | null;
  handleSendMessage?: (event: React.UIEvent, messageInput?: string, chatMode?: ChatMode) => void;
  setActiveTab?: (tab: 'planning' | 'preview') => void;
}

const PlanningView = ({ appSummary, handleSendMessage, setActiveTab }: PlanningViewProps) => {
  // State to track selected features (using Set for efficient lookups)
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());

  // State for additional features added by user
  const [additionalFeatures, setAdditionalFeatures] = useState<Array<AppFeature>>([]);

  // State for editing features
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [featureOverrides, setFeatureOverrides] = useState<Record<number, AppFeature>>({});

  console.log('appSummary', appSummary);

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
    <div className="h-full overflow-auto bg-transparent p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Planning</div>

        <div className="mb-8">
          <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
          <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
        </div>

        <div className="flex justify-center mb-8">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-md"
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

              console.log('filteredAppSummary', filteredAppSummary);
              handleSendMessage?.(e, JSON.stringify(filteredAppSummary), ChatMode.DevelopApp);
              setActiveTab?.('preview');
            }}
          >
            Submit Plan and Develop App
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-bolt-elements-textPrimary">Features</div>
            <div className="text-sm text-bolt-elements-textSecondary">
              {selectedFeatures.size} of {allFeatures.length} selected
            </div>
          </div>

          <div className="space-y-6">
            {allFeatures.map((feature, index) => {
              const featureTests = feature.tests ?? [];
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

                    <div
                      className={classNames('w-4 h-4 rounded-full border-2', {
                        'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor': !done,
                        'bg-green-500 border-green-500': done,
                      })}
                    />

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

                    {done && <div className="text-green-500 text-sm font-medium">✓ Complete</div>}
                  </div>

                  {featureTests.length > 0 && (
                    <div className="divide-y divide-bolt-elements-borderColor">
                      {featureTests.map((test, testIdx) => (
                        <div key={testIdx} className="flex items-center gap-3 p-3 pl-8">
                          <div
                            className={classNames('w-4 h-4 rounded-full border-2', {
                              'bg-green-500 border-green-500': test.status === 'Pass',
                              'bg-red-500 border-red-500': test.status === 'Fail',
                              'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor':
                                test.status === 'NotRun',
                            })}
                          />
                          <div
                            className={classNames('flex-1', {
                              'text-bolt-elements-textPrimary': test.status === 'Pass',
                              'text-bolt-elements-textSecondary': test.status !== 'Pass',
                            })}
                          >
                            {test.recordingId ? (
                              <a
                                href={`https://app.replay.io/recording/${test.recordingId}`}
                                className={classNames(
                                  'hover:underline text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover',
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {test.title}
                              </a>
                            ) : (
                              <span>{test.title}</span>
                            )}
                          </div>
                          <div
                            className={classNames('text-sm font-medium', {
                              'text-green-500': test.status === 'Pass',
                              'text-red-500': test.status === 'Fail',
                              'text-bolt-elements-textSecondary': test.status === 'NotRun',
                            })}
                          >
                            {test.status === 'Pass' && '✓ Pass'}
                            {test.status === 'Fail' && '✗ Fail'}
                            {test.status === 'NotRun' && '○ Not Run'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className=" w-full sticky left-0 bottom-[-25px] mt-6 bg-bolt-elements-background-depth-1 p-4 border-t border-bolt-elements-borderColor shadow-lg">
        <AddFeatureInput onAddFeature={handleAddFeature} />
      </div>
    </div>
  );
};

export default PlanningView;
