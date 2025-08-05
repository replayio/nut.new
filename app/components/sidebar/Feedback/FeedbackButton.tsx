import ReactModal from 'react-modal';
import { feedbackModalStore } from '~/lib/stores/feedbackModal';

ReactModal.setAppElement('#root');

const Feedback = () => {
  return (
    <button
      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-2.5 px-4 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group font-semibold"
      onClick={feedbackModalStore.open}
    >
      <div className="i-ph:chat-circle text-lg transition-transform duration-200 group-hover:scale-110" />
      <span className="transition-transform duration-200 group-hover:scale-105">Feedback</span>
    </button>
  );
};

export default Feedback;
