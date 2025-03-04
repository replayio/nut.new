import ReactModal from 'react-modal';
import { Auth } from './Auth';

// Set custom styles for modal
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Authentication Modal"
      style={customStyles}
      ariaHideApp={false} // This fixes issues with missing appElement
    >
      <Auth onClose={onClose} />
    </ReactModal>
  );
} 