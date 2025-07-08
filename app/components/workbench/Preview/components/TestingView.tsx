import type { AppSummary, AppTest } from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';

const TestingView = ({ appSummary }: { appSummary: AppSummary | null }) => {
  const allTests: AppTest[] = [];
  for (const { tests } of appSummary?.features ?? []) {
    allTests.push(...(tests ?? []));
  }

  return (
    <div className="h-full overflow-auto bg-transparent p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Testing</div>

        <div className="space-y-3">
          <div className="text-lg font-semibold mb-4 text-bolt-elements-textPrimary">Tests</div>
          <div className="space-y-2">
            {allTests.map((test, testIdx) => (
              <div
                key={testIdx}
                className="flex items-center gap-3 p-3 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor"
              >
                <div
                  className={classNames('w-4 h-4 rounded-full border-2', {
                    'bg-green-500 border-green-500': test.status === 'Pass',
                    'bg-red-500 border-red-500': test.status === 'Fail',
                    'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor': test.status === 'NotRun',
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
        </div>
      </div>
    </div>
  );
};

export default TestingView;
