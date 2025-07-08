import { atom } from 'nanostores';
import type { AppSummary } from '~/lib/persistence/messageAppSummary';

export const initialAppSummaryStore = atom<AppSummary | null>(null);

export function setInitialAppSummary(summary: AppSummary) {
  initialAppSummaryStore.set(summary);
}

export function clearAppSummaries() {
  initialAppSummaryStore.set(null);
}
