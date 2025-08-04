import { atom } from 'nanostores';
import { getCurrentUserId } from '~/lib/supabase/client';
import { getPeanutsRemaining } from '~/lib/replay/Account';

// Store with state indicating whether app development is possible.
export class PeanutsStore {
  peanutsRemaining = atom<number | undefined>(undefined);
  peanutsError = atom<string | undefined>(undefined);
}

export const peanutsStore = new PeanutsStore();

export async function refreshPeanutsStore() {
  const userId = await getCurrentUserId();
  const peanuts = userId ? await getPeanutsRemaining() : undefined;
  peanutsStore.peanutsRemaining.set(peanuts);
  if (peanuts) {
    peanutsStore.peanutsError.set(undefined);
  } else if (userId) {
    peanutsStore.peanutsError.set('Out of peanuts, add more to continue building.');
  } else {
    peanutsStore.peanutsError.set('You must be logged in to continue building.');
  }
}
