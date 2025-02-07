import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { sendCommandDedicatedClient } from '~/lib/replay/ReplayProtocolClient';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import { useState } from 'react';

interface BoltProblemDescription {
  problemId: string;
  title: string;
  description: string;
  timestamp: number;
}

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

function ToastContainerWrapper() {
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

async function fetchProblems(): Promise<BoltProblemDescription[]> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "listBoltProblems",
      },
    });
    console.log("ListProblemsRval", rv);
    return (rv as any).rval.problems.reverse();
  } catch (error) {
    console.error("Error fetching problems", error);
    toast.error("Failed to fetch problems");
    return [];
  }
}

function ViewProblemPage() {
  const [problems, setProblems] = useState<BoltProblemDescription[] | null>(null);

  useEffect(() => {
    fetchProblems().then(setProblems);
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

export default ViewProblemPage;
