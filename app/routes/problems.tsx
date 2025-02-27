import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { cssTransition, ToastContainer } from 'react-toastify';
import { Suspense, useEffect, useState } from 'react';
import { listAllProblems, BoltProblemStatus } from '~/lib/replay/Problems';
import type { BoltProblemDescription } from '~/lib/replay/Problems';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export function ToastContainerWrapper() {
  return (
    <ToastContainer
      closeButton={({ closeToast }) => {
        return (
          <button className="Toastify__close-button" onClick={closeToast}>
            <div className="i-ph:x text-lg" />
          </button>
        );
      }}
      icon={({ type }) => {
        /**
         * @todo Handle more types if we need them. This may require extra color palettes.
         */
        switch (type) {
          case 'success': {
            return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
          }
          case 'error': {
            return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
          }
        }

        return undefined;
      }}
      position="bottom-right"
      pauseOnFocusLoss
      transition={toastAnimation}
    />
  );
}

export function Status({ status }: { status: BoltProblemStatus | undefined }) {
  if (!status) {
    status = BoltProblemStatus.Pending;
  }

  const statusColors: Record<BoltProblemStatus, string> = {
    [BoltProblemStatus.Pending]: 'bg-yellow-400 dark:text-yellow-400',
    [BoltProblemStatus.Unsolved]: 'bg-orange-500 dark:text-orange-500',
    [BoltProblemStatus.Solved]: 'bg-blue-500 dark:text-blue-500',
  };

  return (
    <div className="flex items-center gap-2 my-2">
      <span className="font-semibold">Status:</span>
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full bg-opacity-10 dark:bg-opacity-20 ${statusColors[status]}`}
      >
        <span className={`w-2 h-2 rounded-full mr-2 ${statusColors[status]} bg-opacity-100`}></span>
        <span className="font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    </div>
  );
}

export function Keywords({ keywords }: { keywords: string[] | undefined }) {
  if (!keywords?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {keywords.map((keyword, index) => (
        <span
          key={index}
          className="px-3 py-1 text-sm rounded-full border border-bolt-elements-border bg-bolt-elements-background-depth-2 text-bolt-content-primary"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function getProblemStatus(problem: BoltProblemDescription): BoltProblemStatus {
  return problem.status ?? BoltProblemStatus.Pending;
}

const Nothing = () => null;

function ProblemsPage() {
  const [problems, setProblems] = useState<BoltProblemDescription[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<BoltProblemStatus | 'all'>(BoltProblemStatus.Solved);

  useEffect(() => {
    listAllProblems().then(setProblems);
  }, []);

  const filteredProblems = problems?.filter((problem) => {
    return statusFilter === 'all' || getProblemStatus(problem) === statusFilter;
  });

  return (
    <Suspense fallback={<Nothing />}>
      <TooltipProvider>
        <div className="flex flex-col min-h-fit w-full bg-bolt-elements-background-depth-1 dark:bg-black text-gray-900 dark:text-gray-200">
          <BackgroundRays />
          <Header />
          <ClientOnly>{() => <Menu />}</ClientOnly>

          <div className="p-6">
            {problems && (
              <div className="mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as BoltProblemStatus | 'all')}
                  className="appearance-none w-48 px-4 py-2.5 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-border text-bolt-content-primary hover:border-bolt-elements-border-hover focus:outline-none focus:ring-2 focus:ring-bolt-accent-primary/20 focus:border-bolt-accent-primary cursor-pointer relative pr-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px',
                  }}
                >
                  <option value="all">{`All Problems (${problems?.length ?? 0})`}</option>
                  {Object.values(BoltProblemStatus).map((status) => {
                    const count = problems?.filter((problem) => getProblemStatus(problem) === status).length ?? 0;
                    return (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1) + ` (${count})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {problems === null ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : problems.length === 0 ? (
              <div className="text-center text-gray-600">No problems found</div>
            ) : (
              <div className="grid gap-4">
                {filteredProblems?.map((problem) => (
                  <a
                    href={`/problem/${problem.problemId}`}
                    key={problem.problemId}
                    className="p-4 rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors cursor-pointer"
                  >
                    <h2 className="text-xl font-semibold mb-2">{problem.title}</h2>
                    <p className="text-gray-700 dark:text-gray-200 mb-2">{problem.description}</p>
                    <Status status={problem.status} />
                    <Keywords keywords={problem.keywords} />
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      Time: {new Date(problem.timestamp).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
          <ToastContainerWrapper />
        </div>
      </TooltipProvider>
    </Suspense>
  );
}

export default ProblemsPage;
