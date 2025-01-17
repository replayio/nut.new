import { toast } from "react-toastify";
import ReactModal from 'react-modal';
import { assert, sendCommandDedicatedClient } from "~/lib/replay/ReplayProtocolClient";
import { useState } from "react";
import { workbenchStore } from "~/lib/stores/workbench";

ReactModal.setAppElement('#root');

// Combines information about the contents of a project along with a prompt
// from the user and any associated Replay data to accomplish a task. Together
// this information is enough that the model should be able to generate a
// suitable fix.
//
// Must be JSON serializable.
interface ProjectPrompt {
  content: string; // base64 encoded zip file
}

export interface BoltProblem {
  version: number;
  title: string;
  description: string;
  name: string;
  email: string;
  prompt: ProjectPrompt;
}

export function SaveProblem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    name: '',
    email: ''
  });
  const [problemId, setProblemId] = useState<string | null>(null);

  const handleSaveProblem = () => {
    setIsModalOpen(true);
    setFormData({
      title: '',
      description: '',
      name: '',
      email: '',
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
    // Add validation here
    if (!formData.title) {
      toast.error('Please fill in title field');
      return;
    }

    toast.info("Submitting problem...");

    console.log("SubmitProblem", formData);

    await workbenchStore.saveAllFiles();
    const { contentBase64 } = await workbenchStore.generateZipBase64();
    const prompt: ProjectPrompt = { content: contentBase64 };

    const problem: BoltProblem = {
      version: 1,
      title: formData.title,
      description: formData.description,
      name: formData.name,
      email: formData.email,
      prompt,
    };

    try {
      const rv = await sendCommandDedicatedClient({
        method: "Recording.globalExperimentalCommand",
        params: {
          name: "submitBoltProblem",
          params: { problem },
        },
      });
      console.log("SubmitProblemRval", rv);
      setProblemId((rv as any).rval.problemId);
    } catch (error) {
      console.error("Error submitting problem", error);
      toast.error("Failed to submit problem");
    }
  }

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

                <div className="flex items-center">Name (optional):</div>
                <input type="text"
                  name="name"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.name}
                  onChange={handleInputChange}
                />

                <div className="flex items-center">Email (optional):</div>
                <input type="text"
                  name="email"
                  className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
                  value={formData.email}
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
    </>
  );
}
