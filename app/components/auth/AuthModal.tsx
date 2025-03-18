import ReactModal from 'react-modal';
import { Auth } from './Auth';
import { useStore } from '@nanostores/react';
import { isAuthModalOpenStore, authModalStore } from '~/lib/stores/authModal';

export function AuthModal() {
  const isOpen = useStore(isAuthModalOpenStore);

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={authModalStore.close}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
    >
      <Auth onClose={authModalStore.close} />
    </ReactModal>
  );
}
