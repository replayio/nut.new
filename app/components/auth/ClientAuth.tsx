import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import {
  // peanutsStore,
  refreshPeanutsStore,
} from '~/lib/stores/peanuts';
import { accountModalStore } from '~/lib/stores/accountModal';
import { authModalStore } from '~/lib/stores/authModal';
import { signOut, userStore } from '~/lib/stores/auth';
import { useStore } from '@nanostores/react';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { User, Crown, Sparkles, Settings, LogOut } from '~/components/ui/Icon';

export function ClientAuth() {
  const user = useStore(userStore);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [proTooltipTimeout, setProTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const stripeSubscription = useStore(subscriptionStore.subscription);
  // const peanutsRemaining = useStore(peanutsStore.peanutsRemaining);
  
  // Check if this is the mock user (for development)
  const isMockUser = user?.id === 'edb004fa-ed84-4a32-a408-ee89232329fa';

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    } finally {
      setShowDropdown(false);
    }
  };

  const handleShowAccountModal = () => {
    accountModalStore.open('account');
    if (window.analytics) {
      window.analytics.track('Clicked Account Settings button', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        email: user?.email,
      });
    }
    setShowDropdown(false);
  };

  const handleSubscriptionToggle = async () => {
    accountModalStore.open('billing');
    if (window.analytics) {
      window.analytics.track('Clicked View Plans button', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        email: user?.email,
      });
    }
    setShowDropdown(false);
  };

  const useAvatarURL = false;

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
                <User size={18} />
              </span>
            )}
          </button>
          {isMockUser && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 border-2 border-white rounded-full" title="Development Mode"></div>
          )}

          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-[-10px] mt-2 py-3 w-72 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl shadow-2xl z-[100]"
            >
              <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bolt-elements-background-depth-2 rounded-full flex items-center justify-center border border-bolt-elements-borderColor">
                    <User className="text-bolt-elements-textPrimary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-bolt-elements-textSecondary mb-1">
                      Signed in as
                      {isMockUser && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-[10px] font-bold">
                          DEV MODE
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-bolt-elements-textPrimary truncate text-sm">{user.email}</div>
                  </div>
                </div>
              </div>

              {!stripeSubscription ? (
                <div className="px-3 py-2 border-b border-bolt-elements-borderColor">
                  <button
                    onClick={handleSubscriptionToggle}
                    className="w-full px-4 py-3 text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all duration-200 flex items-center gap-3 font-medium shadow-sm hover:shadow-md group"
                  >
                    <Crown className="transition-transform duration-200 group-hover:scale-110" size={20} />
                    <span className="transition-transform duration-200 group-hover:scale-105">View Plans</span>
                  </button>
                </div>
              ) : (
                null
              )}

              {/* <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥜</span>
                    <span className="text-bolt-elements-textPrimary font-medium">Peanuts</span>
                  </div>
                  <div className="text-bolt-elements-textHeading font-bold text-lg">{peanutsRemaining ?? '...'}</div>
                </div>
              </div> */}


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
