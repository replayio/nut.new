import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { submitFeedback } from '~/lib/replay/Problems';
import { getLastChatMessages } from '~/components/chat/Chat.client';

ReactModal.setAppElement('#root');

// Component for deploying a chat to production.

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    netlifySiteId: '',
    netlifyAccountSlug: '',
  });
  const [deployed, setDeployed] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      netlifySiteId: '',
      netlifyAccountSlug: '',
    });
    setDeployed(false);
  };

  const handleDeploy = async () => {
    console.log("DEPLOY", formData);
    /*
    if (!formData.netlifySiteId) {
      toast.error('Please fill in the Netlify Site ID field');

      return;
    }

    toast.info('Submitting feedback...');

    const feedbackData: any = {
      description: formData.description,
      share: formData.share,
      source: 'feedback_modal',
    };

    if (feedbackData.share) {
      feedbackData.chatMessages = getLastChatMessages();
    }

    try {
      const success = await submitFeedback(feedbackData);

      if (success) {
        setSubmitted(true);
        toast.success('Feedback submitted successfully!');
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('An error occurred while submitting feedback');
    }
    */
  };

  return (
    <>
      <button
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={() => {
          handleOpenModal();
        }}
      >
        Deploy
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full z-50">
            {deployed ? (
              <>
                <div className="text-center mb-2">Deployed Succeeded</div>
                <div className="text-center">
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                      }}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-center mb-4">Deploy</h2>
                <div className="text-center mb-4">
                  Deploy this chat's project to production.
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 items-center">
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Site ID (existing site):</label>
                  <input
                    name="netlifySiteId"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.netlifySiteId}
                    placeholder="123e4567-..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        netlifySiteId: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Account Slug (new site):</label>
                  <input
                    name="netlifyAccountSlug"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.netlifyAccountSlug}
                    placeholder="abc..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        netlifyAccountSlug: e.target.value,
                      }));
                    }}
                  />
                </div>

                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={handleDeploy}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Deploy
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
