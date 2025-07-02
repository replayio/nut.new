import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import { getLastChatMessages } from '~/utils/chat/messageUtils';
import FeedbackModal from './components/FeedbackModal';

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
      <FeedbackModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        submitted={submitted}
        formData={formData}
        setFormData={setFormData}
        handleSubmitFeedback={handleSubmitFeedback}
      />
    </>
  );
}
