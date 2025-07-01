import { atom } from 'nanostores';

// Store for tracking the initial app plan summary
export const initialAppSummaryStore = atom<string>('');

// Store for tracking the prebuilt app summary 
export const prebuiltAppSummaryStore = atom<string>('');

// Helper functions to update the summaries
export function setInitialAppSummary(summary: string) {
  initialAppSummaryStore.set(summary);
}

export function setPrebuiltAppSummary(summary: string) {
  prebuiltAppSummaryStore.set(summary); 
}

export function clearAppSummaries() {
  initialAppSummaryStore.set('');
  prebuiltAppSummaryStore.set('');
}
