import { classNames } from '~/utils/classNames';
import { AppFeatureStatus, type AppTest } from '~/lib/persistence/messageAppSummary';

interface TestsProps {
  featureTests: AppTest[];
  status: AppFeatureStatus;
}

const Tests = ({ featureTests, status }: TestsProps) => {
  // Helper function to determine test status display based on test status or feature status
  const getTestDisplayStatus = (test: AppTest): 'Pass' | 'Fail' | 'NotRun' | 'InProgress' => {
    if (test.status !== undefined) {
      return test.status;
    }

    // If test.status is undefined, derive from feature status
    if (status === AppFeatureStatus.Implemented) {
      return 'Pass';
    } else if (status === AppFeatureStatus.Failed) {
      return 'Fail';
    } else if (status === AppFeatureStatus.ImplementationInProgress) {
      return 'InProgress';
    } else {
      return 'NotRun';
    }
  };

  return (
    <div className="border-t border-border">
      <div className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 bg-muted px-2 py-1 rounded-md inline-block">
          Feature Tests ({featureTests.length})
        </div>
        <div className="space-y-3">
          {featureTests.map((test, testIdx) => {
            const displayStatus = getTestDisplayStatus(test);

            return (
              <div
                key={testIdx}
                className="flex items-center gap-3 p-3 bg-card rounded-md border border-border hover:bg-accent/50 transition-colors duration-200"
              >
                {displayStatus === 'InProgress' ? (
                  <div className="w-3 h-3 flex-shrink-0 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
                ) : (
                  <div
                    className={classNames('w-3 h-3 rounded-full border-2 flex-shrink-0', {
                      'bg-foreground border-foreground': displayStatus === 'Pass',
                      'bg-destructive border-destructive': displayStatus === 'Fail',
                      'bg-muted border-border': displayStatus === 'NotRun',
                    })}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground block truncate">{test.title}</span>
                </div>
                <div
                  className={classNames('text-xs font-medium px-2 py-1 rounded-md flex-shrink-0 border', {
                    'text-foreground bg-accent border-border':
                      displayStatus === 'Pass' || displayStatus === 'InProgress',
                    'text-destructive bg-destructive/10 border-destructive/30': displayStatus === 'Fail',
                    'text-muted-foreground bg-muted border-border': displayStatus === 'NotRun',
                  })}
                >
                  {displayStatus === 'Pass' && 'PASS'}
                  {displayStatus === 'Fail' && 'FAIL'}
                  {displayStatus === 'InProgress' && 'IN PROGRESS'}
                  {displayStatus === 'NotRun' && 'PENDING'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Tests;
