import { useStore } from '@nanostores/react';
import { accountModalStore } from '~/lib/stores/accountModal';
import { AccountModal } from './AccountModal';
import { userStore } from '~/lib/stores/auth';
import { SubscriptionModal } from '~/components/subscription/SubscriptionModal';
import useViewport from '~/lib/hooks';
import { User as UserIcon, CreditCard, ArrowLeft, X } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

export function GlobalAccountModal() {
  const isOpen = useStore(accountModalStore.isOpen);
  const user = useStore(userStore);
  const activeTab = useStore(accountModalStore.activeTab);
  const isSmallViewport = useViewport(1024);

  if (!isOpen) {
    return null;
  }

  // Don't render until we have user data
  if (!user) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1001]"
        onClick={() => accountModalStore.close()}
      >
        <div className="bg-card rounded-md p-6 border border-border">
          <div className="text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Mobile: Show tab selection when activeTab is null, otherwise show content
  const showTabSelection = isSmallViewport ? activeTab === null : true;
  const showContent = isSmallViewport ? activeTab !== null : true;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1001]"
      onClick={() => accountModalStore.close()}
    >
      <div
        className="bg-card rounded-md border border-border max-w-6xl w-full mx-4 max-h-[90vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar with Tabs - Hidden on mobile when content is shown */}
        {showTabSelection && (
          <div
            className={`bg-card rounded-l-md border-r border-border flex flex-col ${isSmallViewport ? 'w-full' : 'w-64'}`}
          >
            {/* Header with close/back button */}
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <Button
                onClick={() => accountModalStore.close()}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground hover:text-foreground/80"
                aria-label="Close modal"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 p-3 space-y-1">
              <button
                onClick={() => accountModalStore.activeTab.set('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'account'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <UserIcon size={18} />
                <span className="font-medium">Account</span>
              </button>

              <button
                onClick={() => accountModalStore.activeTab.set('billing')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                  activeTab === 'billing'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <CreditCard size={18} />
                <span className="font-medium">Plans</span>
              </button>
            </nav>
          </div>
        )}

        {/* Right Content Area - Full width on mobile when shown */}
        {showContent && activeTab !== null && (
          <div className={`flex flex-col overflow-hidden ${isSmallViewport ? 'w-full' : 'flex-1'}`}>
            {/* Mobile: Back to Settings button */}
            {isSmallViewport && (
              <div className="p-4 border-b border-border flex items-center gap-3 justify-between">
                <Button onClick={() => accountModalStore.activeTab.set(null)} variant="ghost" className="gap-2">
                  <ArrowLeft size={18} />
                  <span className="font-medium">Settings</span>
                </Button>
                <Button
                  onClick={() => accountModalStore.close()}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-foreground hover:text-foreground/80"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'account' ? <AccountModal user={user} /> : <SubscriptionModal />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
