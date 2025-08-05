import { useStore } from '@nanostores/react';
import { accountModalStore } from '~/lib/stores/accountModal';
import { AccountModal } from './AccountModal';
import { getSupabase } from '~/lib/supabase/client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

export function GlobalAccountModal() {
  const isOpen = useStore(accountModalStore.isOpen);
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await getSupabase().auth.getUser();
        setUser(data.user ?? undefined);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    if (isOpen) {
      getUser();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[1001]"
      onClick={() => accountModalStore.close()}
    >
      <AccountModal user={user} onClose={() => accountModalStore.close()} />
    </div>
  );
}
