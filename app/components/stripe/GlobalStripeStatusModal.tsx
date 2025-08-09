import { useStore } from '@nanostores/react';
import { stripeStatusModalStore, stripeStatusModalActions } from '~/lib/stores/stripeStatusModal';
import { StripeStatusModal } from './StripeStatusModal';

export function GlobalStripeStatusModal() {
  const modalState = useStore(stripeStatusModalStore);

  return (
    <StripeStatusModal
      isOpen={modalState.isOpen}
      onClose={stripeStatusModalActions.close}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
      details={modalState.details}
    />
  );
}
