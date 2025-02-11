import { toast } from "react-toastify";
import ReactModal from 'react-modal';
import { useState } from "react";
import { workbenchStore } from "~/lib/stores/workbench";
import { BoltProblemStatus, getProblemsUsername, updateProblem } from "~/lib/replay/Problems";
import type { BoltProblemInput } from "~/lib/replay/Problems";
import { getLastLoadedProblem } from "../chat/LoadProblemButton";
import { getLastUserSimulationData } from "~/lib/replay/SimulationPrompt";
import { getLastUserPrompt } from "../chat/Chat.client";

ReactModal.setAppElement('#root');

export function SaveSolution() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    evaluator: ''
  });
  const [savedSolution, setSavedSolution] = useState<boolean>(false);

  const handleSaveSolution = () => {
    setIsModalOpen(true);
    setFormData({
      evaluator: '',
    });
    setSavedSolution(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitSolution = async () => {
    // Add validation here
    if (!formData.evaluator) {
      toast.error('Please fill in evaluator field');
      return;
    }

    const savedProblem = getLastLoadedProblem();
    if (!savedProblem) {
      toast.error('No problem loaded');
      return;
    }

    const simulationData = getLastUserSimulationData();
    if (!simulationData) {
      toast.error('No simulation data found');
      return;
    }

    const userPrompt = getLastUserPrompt();
    if (!userPrompt) {
      toast.error('No user prompt found');
      return;
    }

    toast.info("Submitting solution...");

    console.log("SubmitSolution", formData);

    const problem: BoltProblemInput = {
      version: 2,
      title: savedProblem.title,
      description: savedProblem.description,
      username: savedProblem.username,
      repositoryContents: savedProblem.repositoryContents,
      status: BoltProblemStatus.Solved,
      solution: {
        simulationData,
        userPrompt,
        evaluator: formData.evaluator,
      },
    };

    await updateProblem(savedProblem.problemId, problem);

    setSavedSolution(true);
  }

  return (
    <>
      <a
        href="#"
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleSaveSolution}
      >
        Save Solution
      </a>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        {savedSolution && (
          <>
            <div className="text-center mb-2">Solution Saved</div>
            <div className="text-center">
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Close</button>
              </div>
            </div>
          </>
        )}
        {!savedSolution && (
          <>
            <div className="text-center">Save solution for loaded problem from last prompt and recording.</div>
            <div className="text-center">Evaluator describes a condition the explanation must satisfy.</div>
            <div style={{ marginTop: "10px" }}>
              <div className="grid grid-cols-[auto_1fr] gap-4 max-w-md mx-auto">
                <div className="flex items-center">Evaluator:</div>
                <input type="text"
                  name="evaluator"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.evaluator}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={handleSubmitSolution} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit</button>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </>
        )}
      </ReactModal>
    </>
  );
}
