import ReactModal from 'react-modal';
import { feedbackModalStore } from '~/lib/stores/feedbackModal';

ReactModal.setAppElement('#root');

const Feedback = () => {
  return (
    <button
      className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md py-0.75 px-2 transition-theme"
      onClick={feedbackModalStore.open}
    >
      Feedback
    </button>
  );
};

export default Feedback;
