import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState, useEffect } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { submitProblem, BoltProblemStatus } from '~/lib/replay/Problems';
import type { BoltProblemInput, BoltProblemSolution } from '~/lib/replay/Problems';
import { getCurrentUser } from '~/lib/supabase/client';
import { authModalStore } from '~/lib/stores/authModal';
import { authStatusStore } from '~/lib/stores/auth';
import { useStore } from '@nanostores/react';
import {
  getLastUserSimulationData,
  getLastSimulationChatMessages,
  isSimulatingOrHasFinished,
  getLastSimulationChatReferences,
} from '~/lib/replay/SimulationPrompt';

ReactModal.setAppElement('#root');

// External functions for problem storage

async function saveProblem(
  title: string,
  description: string,
  username: string,
  reproData: any,
): Promise<string | null> {
  if (!title) {
    toast.error('Please fill in title field');
    return null;
  }

  toast.info('Submitting problem...');

  const repositoryId = workbenchStore.repositoryId.get();

  if (!repositoryId) {
    toast.error('No repository ID found');
    return null;
  }

  const solution: BoltProblemSolution = {
    evaluator: undefined,
    ...reproData,
  };

  const problem: BoltProblemInput = {
    version: 2,
    title,
    description,
    user_id: (await getCurrentUser())?.id || '',
    repositoryId,
    status: BoltProblemStatus.Pending,
    solution,
  };

  const problemId = await submitProblem(problem);

  if (problemId) {
    localStorage.setItem('loadedProblemId', problemId);
  }

  return problemId;
}

function getReproductionData(): any | null {
  if (!isSimulatingOrHasFinished()) {
    toast.error('No simulation data found (neither in progress nor finished)');
    return null;
  }

  try {
    const simulationData = getLastUserSimulationData();

    if (!simulationData) {
      toast.error('No simulation data found');
      return null;
    }

    const messages = getLastSimulationChatMessages();
    const references = getLastSimulationChatReferences();

    if (!messages) {
      toast.error('No user prompt found');
      return null;
    }

    return { simulationData, messages, references };
  } catch (error: any) {
    console.error('Error getting reproduction data', error?.stack || error);
    toast.error(`Error getting reproduction data: ${error?.message}`);

    return null;
  }
}

// Component for saving the current chat as a new problem.

export function SaveProblem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    username: '',
  });
  const [problemId, setProblemId] = useState<string | null>(null);
  const [reproData, setReproData] = useState<any>(null);
  const isLoggedIn = useStore(authStatusStore.isLoggedIn);

  const handleSaveProblem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentReproData = getReproductionData();

    if (!currentReproData) {
      return;
    }

    setReproData(currentReproData);
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
    if (!reproData) {
      return;
    }

    const newProblemId = await saveProblem(formData.title, formData.description, formData.username, reproData);

    if (newProblemId) {
      setProblemId(newProblemId);
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
        {!isLoggedIn && (
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
        {isLoggedIn && problemId && (
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
        {isLoggedIn && !problemId && (
          <>
            <div className="text-center">
              Save prompts as new problems when AI results are unsatisfactory. Problems are publicly visible and are
              used to improve AI performance.
            </div>
            <div style={{ marginTop: '10px' }}>
              <div className="grid grid-cols-[auto_1fr] gap-4 max-w-md mx-auto">

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
