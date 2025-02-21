import { toast } from "react-toastify";
import ReactModal from 'react-modal';
import { useState } from "react";
import { workbenchStore } from "~/lib/stores/workbench";
import { getProblemsUsername } from "~/lib/replay/Problems";
import type { BoltProblemInput } from "~/lib/replay/Problems";
import { createProblem } from "~/lib/supabase/Problems";
import { logStore } from "~/lib/stores/logs";
import { useStore } from '@nanostores/react';
import { userStore } from "~/lib/stores/auth";
import { AuthModal } from "~/components/auth/AuthModal";

ReactModal.setAppElement('#root');

// Component for saving the current chat as a new problem.

export function SaveProblem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    name: ''
  });
  const [problemId, setProblemId] = useState<string | null>(null);
  const user = useStore(userStore);

  const handleSaveProblem = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setIsModalOpen(true);
    setFormData({
      title: '',
      description: '',
      name: ''
    });
    setProblemId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitProblem = async () => {
    logStore.logSystem('Starting problem submission', { title: formData.title });

    if (!user) {
      logStore.logError('No authenticated user');
      toast.error('Please sign in to save problems');
      setIsAuthModalOpen(true);
      return;
    }

    // Add validation here
    if (!formData.title) {
      const error = new Error('Missing title');
      logStore.logError('Problem submission validation failed', error, { formData });
      toast.error('Please fill in title field');
      return;
    }

    const username = getProblemsUsername();

    if (!username) {
      const error = new Error('Missing username');
      logStore.logError('Problem submission validation failed', error, { formData });
      toast.error('Please fill in username field');
      return;
    }

    toast.info("Submitting problem...");
    logStore.logSystem('Saving all files before problem submission');

    try {
      await workbenchStore.saveAllFiles();
      logStore.logSystem('Files saved successfully');

      const { contentBase64 } = await workbenchStore.generateZipBase64();
      logStore.logSystem('Zip file generated', { 
        contentSize: contentBase64.length,
        title: formData.title 
      });

      const problem: BoltProblemInput = {
        version: 2,
        title: formData.title,
        description: formData.description,
        username,
        repositoryContents: contentBase64,
      };

      logStore.logSystem('Creating problem in database', { 
        title: problem.title,
        description: problem.description,
        username: problem.username 
      });

      const createdProblem = await createProblem({
        title: problem.title,
        description: problem.description,
        status: 'pending',
        keywords: [],
        repository_contents: problem.repositoryContents,
        user_id: user.id
      });

      logStore.logSystem('Problem created successfully', { problemId: createdProblem.id });
      
      if (createdProblem) {
        setProblemId(createdProblem.id);
        toast.success('Problem saved successfully!');
      } else {
        throw new Error('No problem ID returned from creation');
      }
    } catch (error) {
      logStore.logError('Failed to submit problem', error, { 
        title: formData.title,
        description: formData.description 
      });
      toast.error('Failed to save problem');
    }
  };

  return (
    <>
      <a
        href="#"
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleSaveProblem}
      >
        Save Problem
      </a>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        {problemId && (
          <>
            <div className="text-center mb-2">Problem Submitted: {problemId}</div>
            <div className="text-center">
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Close</button>
              </div>
            </div>
          </>
        )}
        {!problemId && (
          <>
            <div className="text-center">Save prompts as new problems when AI results are unsatisfactory.</div>
            <div className="text-center">Problems are publicly visible and are used to improve AI performance.</div>
            <div style={{ marginTop: "10px" }}>
              <div className="grid grid-cols-[auto_1fr] gap-4 max-w-md mx-auto">
                <div className="flex items-center">Title:</div>
                <input type="text"
                  name="title"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.title}
                  onChange={handleInputChange}
                />

                <div className="flex items-center">Description:</div>
                <input type="text"
                  name="description"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={handleSubmitProblem} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit</button>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </>
        )}
      </ReactModal>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
