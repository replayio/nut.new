import { classNames } from '~/utils/classNames';
import { AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';

const PlanningView = ({ appSummary }: { appSummary: AppSummary | null }) => {
  return (
    <div className="h-full overflow-auto bg-transparent p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Planning</div>

        <div className="mb-8">
          <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
          <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
        </div>

        <div className="mb-8">
          <div className="text-lg font-semibold mb-4 text-bolt-elements-textPrimary">Features</div>
          <div className="space-y-6">
            {appSummary?.features?.map((feature, index) => {
              const featureTests = feature.tests ?? [];
              const done = feature.status == AppFeatureStatus.Done;

              return (
                <div
                  key={index}
                  className="rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 border-b border-bolt-elements-borderColor">
                    <div
                      className={classNames('w-4 h-4 rounded-full border-2', {
                        'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor': !done,
                        'bg-green-500 border-green-500': done,
                      })}
                    />
                    <div
                      className={classNames('flex-1', {
                        'text-bolt-elements-textSecondary': !done,
                        'text-bolt-elements-textPrimary': done,
                      })}
                    >
                      {feature.description}
                    </div>
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
                          <div className="flex-1 text-bolt-elements-textPrimary">
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
    </div>
  );
};

export default PlanningView;
