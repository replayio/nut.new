import { atom } from 'nanostores';
import type { User } from '@supabase/supabase-js';

export const TestUserId = 'c6488eb4-1818-4032-a159-4b536edb2b70';

export const userStore = {
  user: atom<User | undefined>({
    id: TestUserId,
    email: 'test@test.com',
    user_metadata: {
      name: 'Test User',
    },
  } as any),

  setUser(user: User | undefined) {
    throw new Error('Not available');
    this.user.set(user);
  },

  getUser() {
    return this.user.get();
  },

  clearUser() {
    throw new Error('Not available');
    this.user.set(undefined);
  },
};
