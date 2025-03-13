import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { submitFeedback } from '~/lib/replay/Problems';
import { getLastProjectContents, getLastChatMessages } from '~/components/chat/Chat.client';

ReactModal.setAppElement('#root');

// Component for leaving feedback.

export function Feedback() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    feedback: '',
    email: '',
    share: false,
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      feedback: '',
      email: '',
      share: false,
    });
    setSubmitted(false);
  };

  const handleSubmitFeedback = async () => {
    // Add validation here
    if (!formData.feedback) {
      toast.error('Please fill in feedback field');
      return;
    }

    if (!formData.email) {
      toast.error('Please fill in email field');
      return;
    }

    toast.info('Submitting feedback...');

    console.log('SubmitFeedback', formData);

    const feedbackData: any = {
      feedback: formData.feedback,
      email: formData.email,
      share: formData.share,
    };

    if (feedbackData.share) {
      // Note: We don't just use the workbench store here because wrangler generates a strange error.
      feedbackData.repositoryContents = getLastProjectContents();
      feedbackData.chatMessages = getLastChatMessages();
    }

    const success = await submitFeedback(feedbackData);

    if (success) {
      setSubmitted(true);
    }
  };

  return (
    <>
      <a
        href="#"
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleOpenModal}
      >
        Feedback
      </a>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        {submitted && (
          <>
            <div className="text-center mb-2">Feedback Submitted</div>
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
        {!submitted && (
          <>
            <div className="text-center">Let us know how Nut is doing.</div>
            <div className="flex items-center">Feedback:</div>
            <textarea
              name="feedback"
              className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
              value={formData.feedback}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  feedback: e.target.value,
                }))
              }
            />
            <div className="flex items-center">Email:</div>
            <input
              type="text"
              name="email"
              className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
            <div className="flex items-center gap-2">
              <span>Share project with the Nut team:</span>
              <input
                type="checkbox"
                name="share"
                className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded border border-gray-300"
                checked={formData.share}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    share: e.target.checked,
                  }))
                }
              />
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={handleSubmitFeedback}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Submit
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </>
        )}
      </ReactModal>
    </>
  );
}
