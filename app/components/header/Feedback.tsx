import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { submitFeedback } from '~/lib/replay/Problems';
import { getLastProjectContents, getLastChatMessages } from '~/components/chat/Chat.client';
import { shouldUseSupabase } from '~/lib/supabase/client';

ReactModal.setAppElement('#root');

// Component for leaving feedback.

export function Feedback() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    email: '',
    share: false,
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      description: '',
      email: '',
      share: false,
    });
    setSubmitted(false);
  };

  const handleSubmitFeedback = async () => {
    if (!formData.description) {
      toast.error('Please fill in the feedback field');

      return;
    }

    if (!shouldUseSupabase() && !formData.email) {
      toast.error('Please fill in the email field');

      return;
    }

    toast.info('Submitting feedback...');

    const feedbackData: any = shouldUseSupabase()
      ? {
          description: formData.description,
          share: formData.share,
          source: 'feedback_modal',
        }
      : {
          feedback: formData.description,
          email: formData.email,
          share: formData.share,
        };

    if (feedbackData.share) {
      feedbackData.repositoryContents = getLastProjectContents();
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
  };

  console.log(shouldUseSupabase() ? 'supabase true' : 'supabase false');

  return (
    <>
      <button
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={() => {
          handleOpenModal();
        }}
      >
        Feedback
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full z-50">
            {submitted ? (
              <>
                <div className="text-center mb-2">Feedback Submitted</div>
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Thank you for your feedback! We appreciate your input.</p>
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
                <h2 className="text-xl font-semibold text-center mb-4">Share Your Feedback</h2>
                <div className="text-center mb-4">
                  Let us know how Nut is doing or report any issues you've encountered.
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Feedback:</label>
                  <textarea
                    name="description"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 w-full border border-gray-300 min-h-[120px]"
                    value={formData.description}
                    placeholder="Tell us what you think or describe any issues..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }));
                    }}
                  />
                </div>

                {!shouldUseSupabase() && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Email:</label>
                    <input
                      type="email"
                      name="email"
                      className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 w-full border border-gray-300"
                      value={formData.email}
                      placeholder="Enter your email address"
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }));
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-6">
                  <input
                    type="checkbox"
                    id="share-project"
                    name="share"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded border border-gray-300"
                    checked={formData.share}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        share: e.target.checked,
                      }));
                    }}
                  />
                  <label htmlFor="share-project" className="text-sm text-gray-700">
                    Share project with the Nut team (helps us diagnose issues)
                  </label>
                </div>

                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={handleSubmitFeedback}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Submit Feedback
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
