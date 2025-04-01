import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ToastContainerWrapper, Status, Keywords } from './problems';
import { Suspense, useEffect, useState } from 'react';
import { useParams } from '@remix-run/react';
import { getProblem, NutProblemStatus } from '~/lib/replay/Problems';
import type { NutProblem, NutProblemComment } from '~/lib/replay/Problems';

function Comments({ comments }: { comments: NutProblemComment[] }) {
  return (
    <div className="space-y-4 mt-6">
      {comments.map((comment, index) => (
        <div
          data-testid="problem-comment"
          key={index}
          className="bg-bolt-elements-background-depth-2 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-bolt-text">{comment.username ?? 'Anonymous'}</span>
            <span className="text-sm text-bolt-text-secondary">
              {(() => {
                const date = new Date(comment.timestamp);
                return date && !isNaN(date.getTime()) ? date.toLocaleString() : 'Unknown date';
              })()}
            </span>
          </div>
          <div className="text-bolt-text whitespace-pre-wrap">{comment.content}</div>
        </div>
      ))}
    </div>
  );
}

function ProblemViewer({ problem }: { problem: NutProblem }) {
  const { problemId, title, description, status = NutProblemStatus.Pending, keywords = [], comments = [] } = problem;

  return (
    <div className="benchmark">
      <h1 className="text-xl4 font-semibold mb-2">{title}</h1>
      <p>{description}</p>
      <a
        href={`/load-problem/${problemId}`}
        className="load-button inline-block px-4 py-2 mt-3 mb-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 font-medium"
      >
        Load Problem
      </a>
      <Status status={status} />
      <Keywords keywords={keywords} />
      <Comments comments={comments} />
    </div>
  );
}

const Nothing = () => null;

function ViewProblemPage() {
  const params = useParams();
  const problemId = params.id;

  if (typeof problemId !== 'string') {
    throw new Error('Problem ID is required');
  }

  const [problemData, setProblemData] = useState<NutProblem | null>(null);

  useEffect(() => {
    getProblem(problemId).then(setProblemData);
  }, [problemId]);

  return (
    <Suspense fallback={<Nothing />}>
      <TooltipProvider>
        <div className="flex flex-col h-full min-h-screen w-full bg-bolt-elements-background-depth-1 text-gray-900 dark:text-gray-200">
          <BackgroundRays />
          <Header />
          <ClientOnly>{() => <Menu />}</ClientOnly>

          <div className="p-6">
            {problemData === null ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : (
              <ProblemViewer problem={problemData} />
            )}
          </div>
          <ToastContainerWrapper />
        </div>
      </TooltipProvider>
    </Suspense>
  );
}

export default ViewProblemPage;
