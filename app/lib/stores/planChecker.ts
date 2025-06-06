import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

export const showPlanCheckerStore = atom<boolean>(false);
export const promptMessageStore = atom<string>('');

export function usePlanCheckerVisibility() {
  const isVisible = useStore(showPlanCheckerStore);
  const savedPrompt = useStore(promptMessageStore);

  return {
    isPlanCheckerVisible: isVisible,
    togglePlanChecker: () => showPlanCheckerStore.set(!isVisible),
    showPlanChecker: () => showPlanCheckerStore.set(true),
    hidePlanChecker: () => showPlanCheckerStore.set(false),
    savePromptMessage: (message: string) => promptMessageStore.set(message),
    savedPrompt
  };
}
