import ReactModal from 'react-modal';
import { Auth } from './Auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
    >
      <Auth onClose={onClose} />
    </ReactModal>
  );
}
