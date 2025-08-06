import { atom } from 'nanostores';
import type { User } from '@supabase/supabase-js';

export const userStore = {
  user: atom<User | undefined>(undefined),

  setUser(user: User | undefined) {
    this.user.set(user);
  },

  getUser() {
    return this.user.get();
  },

  clearUser() {
    this.user.set(undefined);
  },
};
