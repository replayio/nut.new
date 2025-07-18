import ReactModal from 'react-modal';
import { useStore } from '@nanostores/react';
import { feedbackModalState, feedbackModalStore } from '~/lib/stores/feedbackModal';
import { toast } from 'react-toastify';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import { getLastChatMessages } from '~/utils/chat/messageUtils';

const GlobalFeedbackModal = () => {
  const { isOpen, formData, submitted } = useStore(feedbackModalState);

  const handleSubmitFeedback = async () => {
    if (!formData.description) {
      toast.error('Please fill in the feedback field');
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
      const success = await supabaseSubmitFeedback(feedbackData);

      if (success) {
        feedbackModalStore.setSubmitted(true);
        toast.success('Feedback submitted successfully!');
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('An error occurred while submitting feedback');
    }
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={feedbackModalStore.close}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 outline-none max-w-2xl w-full mx-4"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
    >
      <div className="bg-bolt-elements-background-depth-1 rounded-lg p-8 border border-bolt-elements-borderColor">
        {submitted ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Feedback Submitted</h2>
            <div className="text-center">
              <p className="text-bolt-elements-textSecondary mb-6">
                Thank you for your feedback! We appreciate your input.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={feedbackModalStore.close}
                  className="px-4 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Share Your Feedback</h2>
            <div className="text-center mb-6 text-bolt-elements-textSecondary">
              Let us know how Nut is doing or report any issues you've encountered.
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">Your Feedback:</label>
              <textarea
                name="description"
                className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[120px]"
                value={formData.description}
                placeholder="Tell us what you think or describe any issues..."
                onChange={(e) => {
                  feedbackModalStore.setFormData({
                    ...formData,
                    description: e.target.value,
                  });
                }}
              />
            </div>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                id="share-project"
                name="share"
                className="bg-bolt-elements-background-depth-2 text-green-500 rounded border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500"
                checked={formData.share}
                onChange={(e) => {
                  feedbackModalStore.setFormData({
                    ...formData,
                    share: e.target.checked,
                  });
                }}
              />
              <label htmlFor="share-project" className="text-sm text-bolt-elements-textSecondary">
                Share project with the Nut team (helps us diagnose issues)
              </label>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleSubmitFeedback}
                className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Submit Feedback
              </button>
              <button
                onClick={feedbackModalStore.close}
                className="px-4 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-col justify-center gap-3 mt-6">
              <h2 className="text-2xl font-bold mt-6 text-bolt-elements-textPrimary text-center">Or</h2>
              <h4 className="text-xl font-bold mb-4 mt-6 text-bolt-elements-textPrimary text-center">
                <a
                  className="text-green-500 hover:text-green-600 transition-colors cursor-pointer"
                  href="https://cal.com/filip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Schedule a call with the Nut Team to discuss an issue or give feedback.
                </a>
              </h4>
            </div>
          </>
        )}
      </div>
    </ReactModal>
  );
};

export default GlobalFeedbackModal;
