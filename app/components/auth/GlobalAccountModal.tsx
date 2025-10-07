import { useStore } from '@nanostores/react';
import { accountModalStore } from '~/lib/stores/accountModal';
import { AccountModal } from './AccountModal';
import { getSupabase } from '~/lib/supabase/client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { SubscriptionModal } from '~/components/subscription/SubscriptionModal';
import { subscriptionModalStore } from '~/lib/stores/subscriptionModal';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { IconButton } from '~/components/ui/IconButton';

export function GlobalAccountModal() {
  const isOpen = useStore(accountModalStore.isOpen);
  const { currentTier } = useStore(subscriptionModalStore);
  const [user, setUser] = useState<User | undefined>(undefined);
  const activeTab = useStore(accountModalStore.activeTab);
  const { isMobile } = useIsMobile();

  useEffect(() => {
    async function getUser() {
      try {
        const { data, error } = await getSupabase().auth.getUser();
        if (error) {
          console.error('GlobalAccountModal - Auth error:', error);
        }
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

  // Don't render until we have user data
  if (!user) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[1001]"
        onClick={() => accountModalStore.close()}
      >
        <div className="bg-bolt-elements-background-depth-1 rounded-2xl p-6">
          <div className="text-bolt-elements-textPrimary">Loading...</div>
        </div>
      </div>
    );
  }

  // Mobile: Show tab selection when activeTab is null, otherwise show content
  const showTabSelection = isMobile ? activeTab === null : true;
  const showContent = isMobile ? activeTab !== null : true;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[1001]"
      onClick={() => accountModalStore.close()}
    >
      <div
        className="bg-bolt-elements-background-depth-1 rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar with Tabs - Hidden on mobile when content is shown */}
        {showTabSelection && (
          <div
            className={`bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor flex flex-col ${isMobile ? 'w-full' : 'w-64'}`}
          >
            {/* Header with close/back button */}
            <div className="p-4 border-b border-bolt-elements-borderColor flex justify-between items-center">
              <h2 className="text-lg font-semibold text-bolt-elements-textHeading">Settings</h2>
              <IconButton
                onClick={() => accountModalStore.close()}
                className="flex items-center justify-center w-8 h-8 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-all duration-200 hover:scale-105"
                aria-label="Close modal"
                icon="i-ph:x"
                size="xxl"
              />
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 p-3 space-y-1">
              <button
                onClick={() => accountModalStore.activeTab.set('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeTab === 'account'
                    ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor shadow-sm'
                    : 'text-bolt-elements-textSecondary bg-bolt-elements-background-depth-3 hover:border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary'
                }`}
              >
                <div className="i-ph:user text-lg" />
                <span className="font-medium">Account</span>
              </button>

              <button
                onClick={() => accountModalStore.activeTab.set('billing')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeTab === 'billing'
                    ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor shadow-sm'
                    : 'text-bolt-elements-textSecondary bg-bolt-elements-background-depth-3 hover:border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary'
                }`}
              >
                <div className="i-ph:credit-card text-lg" />
                <span className="font-medium">Plans</span>
              </button>
            </nav>
          </div>
        )}

        {/* Right Content Area - Full width on mobile when shown */}
        {showContent && activeTab !== null && (
          <div className={`flex flex-col overflow-hidden ${isMobile ? 'w-full' : 'flex-1'}`}>
            {/* Mobile: Back to Settings button */}
            {isMobile && (
              <div className="p-4 border-b border-bolt-elements-borderColor flex items-center gap-3 justify-between">
                <button
                  onClick={() => accountModalStore.activeTab.set(null)}
                  className="flex items-center gap-2  bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary hover:text-bolt-elements-textSecondary transition-colors"
                >
                  <div className="i-ph:arrow-left text-lg" />
                  <span className="font-medium">Back to Settings</span>
                </button>
                <IconButton
                  onClick={() => accountModalStore.close()}
                  className="flex items-center justify-center w-8 h-8 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-all duration-200 hover:scale-105"
                  aria-label="Close modal"
                  icon="i-ph:x"
                  size="xxl"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'account' ? <AccountModal user={user} /> : <SubscriptionModal currentTier={currentTier} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
