import { useStore } from '@nanostores/react';
import { appCardModalStore, closeAppCardModal } from '~/lib/stores/appCardModal';
import { AppCardModal } from './AppCardModal';

export function GlobalAppCardModal() {
  const { isOpen, type, appSummary, feature } = useStore(appCardModalStore);

  if (!isOpen || !appSummary) {
    return null;
  }

  return (
    <AppCardModal isOpen={isOpen} onClose={closeAppCardModal} type={type} appSummary={appSummary} feature={feature} />
  );
}
