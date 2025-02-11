import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ToastContainerWrapper } from './problems';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { useState } from 'react';
import { useParams } from '@remix-run/react';
import { getNutAdminKey, getProblem, updateProblem as backendUpdateProblem, getProblemsUsername, BoltProblemStatus } from '~/lib/replay/Problems';
import type { BoltProblem, BoltProblemComment, BoltProblemInput } from '~/lib/replay/Problems';

function Status({ status }: { status: BoltProblemStatus }) {
  return (
    <div>
      <h3>Status</h3>
      <span className={`status status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

function Keywords({ keywords }: { keywords: string[] }) {
  return (
    <div>
      <h3>Keywords</h3>
      <div className="keywords">
        {keywords.map((keyword, index) => (
          <span key={index} className="keyword">
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

function Comments({ comments }: { comments: BoltProblemComment[] }) {
  return (
    <div className="comments">
      <h3>Comments</h3>
      {comments.map((comment, index) => (
        <div key={index} className="comment">
          <div className="comment-header">
            <span className="comment-author">{comment.username ?? ""}</span>
            <span className="comment-date">
              {new Date(comment.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="comment-text">{comment.content}</div>
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
        className="load-button inline-block px-4 py-2 mt-4 mb-6 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 font-medium"
      >
        Load Problem
      </a>
      <Status status={status} />
      <Keywords keywords={keywords} />
      <Comments comments={comments} />
    </div>
  )
}

type DoUpdateCallback = (problem: BoltProblem) => BoltProblem;
type UpdateProblemCallback = (doUpdate: DoUpdateCallback) => void;

function CommentForm({ updateProblem }: { updateProblem: UpdateProblemCallback }) {
  const [comment, setComment] = useState({
    author: '',
    text: ''
  })

  const handleAddComment = (content: string) => {
    const newComment: BoltProblemComment = {
      timestamp: Date.now(),
      username: getProblemsUsername(),
      content,
    }
    updateProblem(problem => {
      const comments = [...(problem.comments || []), newComment];
      return {
        ...problem,
        comments,
      };
    });
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (comment.text.trim() && comment.author.trim()) {
      handleAddComment(comment.text)
      setComment({ author: '', text: '' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        value={comment.text}
        onChange={(e) => setComment({ ...comment, text: e.target.value })}
        placeholder="Add a comment..."
        rows={3}
        required
      />
      <button 
        type="submit" 
        disabled={!comment.text.trim() || !comment.author.trim()}
      >
        Add Comment
      </button>
    </form>
  )
}

function ViewProblemPage() {
  const params = useParams();
  const problemId = params.id;
  if (typeof problemId !== 'string') {
    throw new Error('Problem ID is required');
  }

  const [problemData, setProblemData] = useState<BoltProblem | null>(null);

  const hasAdminKey = !!getNutAdminKey();

  const updateProblem = async (callback: DoUpdateCallback) => {
    if (!problemData) {
      toast.error('Problem data missing');
      return;
    }
    const newProblem = callback(problemData);
    setProblemData(newProblem);
    await backendUpdateProblem(problemId, newProblem);
  }

  useEffect(() => {
    getProblem(problemId).then(setProblemData);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <BackgroundRays />
        <Header />
        <ClientOnly>{() => <Menu />}</ClientOnly>
        
        <div className="p-6">
          {problemData === null
           ? (<div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>)
           : <ProblemViewer problem={problemData} />}
        </div>
        {hasAdminKey && problemData && (
          <CommentForm updateProblem={updateProblem} />
        )}
        <ToastContainerWrapper />
      </div>
    </TooltipProvider>
  );
}

export default ViewProblemPage;
