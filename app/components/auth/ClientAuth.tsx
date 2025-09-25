import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

import { peanutsStore, refreshPeanutsStore } from '~/lib/stores/peanuts';
import { accountModalStore } from '~/lib/stores/accountModal';
import { authModalStore } from '~/lib/stores/authModal';
import { userStore } from '~/lib/stores/userAuth';
import { useStore } from '@nanostores/react';

export function ClientAuth() {
  const user = useStore(userStore.user);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [proTooltipTimeout, setProTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const peanutsRemaining = useStore(peanutsStore.peanutsRemaining);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await getSupabase().auth.getUser();
        userStore.setUser(data.user ?? undefined);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      userStore.setUser(session?.user ?? undefined);
      if (session?.user) {
        authModalStore.close();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  */

  useEffect(() => {
    if (showDropdown) {
      refreshPeanutsStore();
    }
  }, [showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSignOut = async () => {
    try {
      await getSupabase().auth.signOut();
      userStore.clearUser();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    } finally {
      setShowDropdown(false);
    }
  };

  const handleShowAccountModal = () => {
    accountModalStore.open();
    setShowDropdown(false);
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />;
  }

  const useAvatarURL = false;

  console.log('user', user);

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            ref={buttonRef}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-white/20 hover:border-white/30 group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {useAvatarURL && user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="User avatar"
                className="w-full h-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-110"
              />
            ) : (
              <span className="text-sm font-semibold transition-transform duration-200 group-hover:scale-110">
                <div className="i-ph:user text-lg" />
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-[-10px] mt-2 py-3 w-72 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl shadow-2xl z-10"
            >
              <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥜</span>
                    <span className="text-bolt-elements-textPrimary font-medium">Peanuts</span>
                  </div>
                  <div className="text-bolt-elements-textHeading font-bold text-lg">{peanutsRemaining ?? '...'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => authModalStore.open(false)}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl hover:from-blue-600 hover:to-green-600 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
        >
          <span className="transition-transform duration-200 group-hover:scale-105">Sign In</span>
        </button>
      )}
    </>
  );
}