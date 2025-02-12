import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { cssTransition, ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import { useState } from 'react';
import { BoltProblemStatus, listAllProblems } from '~/lib/replay/Problems';
import type { BoltProblemDescription } from '~/lib/replay/Problems';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export function ToastContainerWrapper() {
  return <ToastContainer
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
}

export function Status({ status }: { status: BoltProblemStatus | undefined }) {
  if (!status) {
    status = BoltProblemStatus.Pending;
  }

  const statusColors: Record<BoltProblemStatus, string> = {
    [BoltProblemStatus.Pending]: 'bg-yellow-400',
    [BoltProblemStatus.Unsolved]: 'bg-orange-500',
    [BoltProblemStatus.HasPrompt]: 'bg-blue-200',
    [BoltProblemStatus.Solved]: 'bg-blue-500'
  };

  return (
    <div className="flex items-center gap-2 my-2">
      <span className="font-semibold">Status:</span>
      <div className={`inline-flex items-center px-3 py-1 rounded-full bg-opacity-10 ${statusColors[status]} text-${status}`}>
        <span className={`w-2 h-2 rounded-full mr-2 ${statusColors[status]}`}></span>
        <span className="font-medium">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
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

function ProblemsPage() {
  const [problems, setProblems] = useState<BoltProblemDescription[] | null>(null);

  useEffect(() => {
    listAllProblems().then(setProblems);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <BackgroundRays />
        <Header />
        <ClientOnly>{() => <Menu />}</ClientOnly>
        
        <div className="p-6">
          {problems === null ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center text-gray-600">No problems found</div>
          ) : (
            <div className="grid gap-4">
              {problems.map((problem) => (
                <a
                  href={`/problem/${problem.problemId}`}
                  key={problem.problemId}
                  className="p-4 rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors cursor-pointer"
                >
                  <h2 className="text-xl font-semibold mb-2">{problem.title}</h2>
                  <p className="text-gray-700 mb-2">{problem.description}</p>
                  <Status status={problem.status} />
                  <Keywords keywords={problem.keywords} />
                  <p className="text-sm text-gray-600">
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
  );
}

export default ProblemsPage;
