import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState, useEffect } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { getProblemsUsername, submitProblem, saveProblemsUsername, BoltProblemStatus } from '~/lib/replay/Problems';
import type { BoltProblemInput } from '~/lib/replay/Problems';
import { getRepositoryContents } from '~/lib/replay/Repository';
import { shouldUseSupabase, getCurrentUser, isAuthenticated } from '~/lib/supabase/client';
import { authModalStore } from '~/lib/stores/authModal';

ReactModal.setAppElement('#root');

// Component for saving the current chat as a new problem.

export function SaveProblem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    username: '',
  });
  const [problemId, setProblemId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check authentication status and get username
  useEffect(() => {
    async function checkAuthAndUsername() {
      if (shouldUseSupabase()) {
        const authenticated = await isAuthenticated();
        setIsLoggedIn(authenticated);
      } else {
        setIsLoggedIn(true); // Always considered logged in when not using Supabase

        const username = getProblemsUsername();

        if (username) {
          setFormData((prev) => ({ ...prev, username }));
        }
      }
    }

    checkAuthAndUsername();
  }, []);

  const handleSaveProblem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
    setProblemId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitProblem = async () => {
    if (!formData.title) {
      toast.error('Please fill in title field');
      return;
    }

    if (!shouldUseSupabase() && !formData.username) {
      toast.error('Please enter a username');
      return;
    }

    // Only save username to cookie if not using Supabase
    if (!shouldUseSupabase()) {
      saveProblemsUsername(formData.username);
    }

    toast.info('Submitting problem...');

    const repositoryId = workbenchStore.repositoryId.get();

    if (!repositoryId) {
      toast.error('No repository ID found');
      return;
    }

    const repositoryContents = await getRepositoryContents(repositoryId);

    const problem: BoltProblemInput = {
      version: 2,
      title: formData.title,
      description: formData.description,
      username: shouldUseSupabase() ? (await getCurrentUser()) || '' : formData.username,
      repositoryContents,
      status: BoltProblemStatus.Pending,
    };

    const problemId = await submitProblem(problem);

    if (problemId) {
      setProblemId(problemId);
    }
  };

  return (
    <>
      <button
        type="button"
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleSaveProblem}
      >
        Save Problem
      </button>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '100%',
          },
        }}
      >
        {shouldUseSupabase() && !isLoggedIn && (
          <div className="text-center">
            <div className="mb-4">Please log in to save a problem</div>
            <button
              onClick={() => {
                setIsModalOpen(false);
                authModalStore.open();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Log In
            </button>
          </div>
        )}
        {(!shouldUseSupabase() || isLoggedIn) && problemId && (
          <>
            <div className="text-center mb-2">Problem Submitted: {problemId}</div>
            <div className="text-center">
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
        {(!shouldUseSupabase() || isLoggedIn) && !problemId && (
          <>
            <div className="text-center">
              Save prompts as new problems when AI results are unsatisfactory. Problems are publicly visible and are
              used to improve AI performance.
            </div>
            <div style={{ marginTop: '10px' }}>
              <div className="grid grid-cols-[auto_1fr] gap-4 max-w-md mx-auto">
                {!shouldUseSupabase() && (
                  <>
                    <div className="flex items-center">Username:</div>
                    <input
                      type="text"
                      name="username"
                      className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </>
                )}

                <div className="flex items-center">Title:</div>
                <input
                  type="text"
                  name="title"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.title}
                  onChange={handleInputChange}
                />

                <div className="flex items-center">Description:</div>
                <input
                  type="text"
                  name="description"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={handleSubmitProblem}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Submit
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </ReactModal>
    </>
  );
}
