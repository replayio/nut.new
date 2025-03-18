import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { updateProblem } from '~/lib/replay/Problems';
import type { BoltProblem, BoltProblemInput, BoltProblemSolution } from '~/lib/replay/Problems';
import { getOrFetchLastLoadedProblem } from '~/components/chat/LoadProblemButton';
import {
  getLastUserSimulationData,
  getLastSimulationChatMessages,
  isSimulatingOrHasFinished,
} from '~/lib/replay/SimulationPrompt';

ReactModal.setAppElement('#root');

/*
 * Component for saving input simulation and prompt information for
 * the problem the current chat was loaded from.
 */

export function SaveReproductionModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedReproduction, setSavedReproduction] = useState<boolean>(false);
  const [problem, setProblem] = useState<BoltProblem | null>(null);

  const handleSaveReproduction = async () => {
    const loadId = toast.loading('Loading problem...');

    try {
      const lastProblem = await getOrFetchLastLoadedProblem();

      if (!lastProblem) {
        toast.error('No problem loaded');
        return;
      }

      setProblem(lastProblem);
    } finally {
      toast.dismiss(loadId);
    }
    setSavedReproduction(false);
    setIsModalOpen(true);
  };

  const handleSubmitReproduction = async () => {
    if (!problem) {
      toast.error('No problem loaded');
      return;
    }

    if (!isSimulatingOrHasFinished()) {
      toast.error('No simulation data found (neither in progress nor finished)');
      return;
    }

    try {
      toast.info('Submitting reproduction...');
      console.log('SubmitReproduction');

      const simulationData = getLastUserSimulationData();

      if (!simulationData) {
        toast.error('No simulation data found');
        return;
      }

      const messages = getLastSimulationChatMessages();

      if (!messages) {
        toast.error('No user prompt found');
        return;
      }

      const reproData = { simulationData, messages };

      /**
       * TODO: Split `solution` into `reproData` and `evaluator`.
       */
      const solution: BoltProblemSolution = {
        evaluator: problem.solution?.evaluator,
        ...reproData,

        /*
         * TODO: Also store recordingId for easier debugging.
         * recordingId,
         */
      };

      const problemUpdatePacket: BoltProblemInput = {
        ...problem,
        version: 2,
        solution,
      };

      await updateProblem(problem.problemId, problemUpdatePacket);

      setSavedReproduction(true);
    } catch (error: any) {
      console.error('Error saving reproduction', error?.stack || error);
      toast.error(`Error saving reproduction: ${error?.message}`);
    }
  };

  return (
    <>
      <a
        href="#"
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleSaveReproduction}
      >
        Save Reproduction
      </a>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        {savedReproduction && (
          <>
            <div className="text-center mb-2">Reproduction Saved</div>
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
        {!savedReproduction && (
          <>
            <div className="text-center">
              Save reproduction data (prompt, user annotations + simulationData) for the currently loaded problem:{' '}
              {problem?.problemId}
            </div>
            <div style={{ marginTop: '10px' }}>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={handleSubmitReproduction}
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
