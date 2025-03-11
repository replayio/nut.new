import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ToastContainerWrapper, Status, Keywords } from './problems';
import { toast } from 'react-toastify';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  getProblem,
  updateProblem as backendUpdateProblem,
  getProblemsUsername,
  BoltProblemStatus,
  getNutIsAdmin,
} from '~/lib/replay/Problems';
import type { BoltProblem, BoltProblemComment } from '~/lib/replay/Problems';

function Comments({ comments }: { comments: BoltProblemComment[] }) {
  return (
    <div className="space-y-4 mt-6">
      {comments.map((comment, index) => (
        <div key={index} className="bg-bolt-elements-background-depth-2 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-bolt-text">{comment.username ?? 'Anonymous'}</span>
            <span className="text-sm text-bolt-text-secondary">{new Date(comment.timestamp).toLocaleString()}</span>
          </div>
          <div className="text-bolt-text whitespace-pre-wrap">{comment.content}</div>
        </div>
      ))}
    </div>
  );
}

function ProblemViewer({ problem }: { problem: BoltProblem }) {
  const { problemId, title, description, status = BoltProblemStatus.Pending, keywords = [], comments = [] } = problem;

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

interface UpdateProblemFormProps {
  handleSubmit: (content: string) => void;
  updateText: string;
  placeholder: string;
}

function UpdateProblemForm(props: UpdateProblemFormProps) {
  const { handleSubmit, updateText, placeholder } = props;
  const [value, setValue] = useState('');

  const onSubmitClicked = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (value.trim()) {
      handleSubmit(value);
      setValue('');
    }
  };

  return (
    <form onSubmit={onSubmitClicked} className="mb-6 p-4 bg-bolt-elements-background-depth-2 rounded-lg">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full p-3 mb-3 bg-bolt-elements-background-depth-3 rounded-md border border-bolt-elements-background-depth-4 text-black placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px]"
        required
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {updateText}
      </button>
    </form>
  );
}

type DoUpdateCallback = (problem: BoltProblem) => BoltProblem;
type UpdateProblemCallback = (doUpdate: DoUpdateCallback) => void;
type DeleteProblemCallback = () => void;

function UpdateProblemForms({
  updateProblem,
  deleteProblem,
}: {
  updateProblem: UpdateProblemCallback;
  deleteProblem: DeleteProblemCallback;
}) {
  const handleAddComment = (content: string) => {
    const newComment: BoltProblemComment = {
      timestamp: Date.now(),
      username: getProblemsUsername(),
      content,
    };
    updateProblem((problem) => {
      const comments = [...(problem.comments || []), newComment];
      return {
        ...problem,
        comments,
      };
    });
  };

  const handleSetTitle = (title: string) => {
    updateProblem((problem) => ({
      ...problem,
      title,
    }));
  };

  const handleSetDescription = (description: string) => {
    updateProblem((problem) => ({
      ...problem,
      description,
    }));
  };

  const handleSetStatus = (status: string) => {
    const statusEnum = BoltProblemStatus[status as keyof typeof BoltProblemStatus];

    if (!statusEnum) {
      toast.error('Invalid status');
      return;
    }

    updateProblem((problem) => ({
      ...problem,
      status: statusEnum,
    }));
  };

  const handleSetKeywords = (keywordString: string) => {
    const keywords = keywordString
      .split(' ')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
    updateProblem((problem) => ({
      ...problem,
      keywords,
    }));
  };

  return (
    <>
      <UpdateProblemForm handleSubmit={handleAddComment} updateText="Add Comment" placeholder="Add a comment..." />
      <UpdateProblemForm
        handleSubmit={handleSetTitle}
        updateText="Set Title"
        placeholder="Set the title of the problem..."
      />
      <UpdateProblemForm
        handleSubmit={handleSetDescription}
        updateText="Set Description"
        placeholder="Set the description of the problem..."
      />
      <UpdateProblemForm
        handleSubmit={handleSetStatus}
        updateText="Set Status"
        placeholder="Set the status of the problem..."
      />
      <UpdateProblemForm
        handleSubmit={handleSetKeywords}
        updateText="Set Keywords"
        placeholder="Set the keywords of the problem..."
      />

      <div className="mb-6 p-4 bg-bolt-elements-background-depth-2 rounded-lg">
        <button
          onClick={deleteProblem}
          className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium"
        >
          Delete Problem
        </button>
      </div>
    </>
  );
}

const Nothing = () => null;

function ViewProblemPage() {
  const params = useParams();
  const problemId = params.id;

  if (typeof problemId !== 'string') {
    throw new Error('Problem ID is required');
  }

  const [problemData, setProblemData] = useState<BoltProblem | null>(null);

  const updateProblem = useCallback(
    async (callback: DoUpdateCallback) => {
      if (!problemData) {
        toast.error('Problem data missing');
        return;
      }

      const newProblem = callback(problemData);
      setProblemData(newProblem);
      console.log('BackendUpdateProblem', problemId, newProblem);
      await backendUpdateProblem(problemId, newProblem);
    },
    [problemData],
  );

  const deleteProblem = useCallback(async () => {
    console.log('BackendDeleteProblem', problemId);
    await backendUpdateProblem(problemId, undefined);
    toast.success('Problem deleted');
  }, [problemData]);

  useEffect(() => {
    getProblem(problemId).then(setProblemData);
  }, [problemId]);

  return (
    <Suspense fallback={<Nothing />}>
      <TooltipProvider>
        <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1 text-gray-900 dark:text-gray-200">
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
          {getNutIsAdmin() && problemData && (
            <UpdateProblemForms updateProblem={updateProblem} deleteProblem={deleteProblem} />
          )}
          <ToastContainerWrapper />
        </div>
      </TooltipProvider>
    </Suspense>
  );
}

export default ViewProblemPage;
