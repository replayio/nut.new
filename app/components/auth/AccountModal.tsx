import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useStore } from '@nanostores/react';
import { cancelSubscription, manageBilling, checkSubscriptionStatus } from '~/lib/stripe/client';
import { classNames } from '~/utils/classNames';
import { stripeStatusModalActions } from '~/lib/stores/stripeStatusModal';
import { ConfirmCancelModal } from '~/components/subscription/ConfirmCancelModal';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { User as UserIcon, Crown, Settings } from '~/components/ui/Icon';
import { accountModalStore } from '~/lib/stores/accountModal';
import { Button } from '~/components/ui/button';
import useViewport from '~/lib/hooks';

interface AccountModalProps {
  user: User | undefined;
}

export const AccountModal = ({ user }: AccountModalProps) => {
  const stripeSubscription = useStore(subscriptionStore.subscription);
  const [loading, setLoading] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isSmallViewport = useViewport(1024);

  const reloadAccountData = async () => {
    setLoading(true);
    setLoadingBilling(true);

    const stripeStatus = await checkSubscriptionStatus();
    subscriptionStore.setSubscription(stripeStatus);

    setLoading(false);
    setLoadingBilling(false);
  };

  useEffect(() => {
    reloadAccountData();
  }, []);

  const handleCancelSubscription = () => {
    if (!user?.email) {
      stripeStatusModalActions.showError(
        'Sign In Required',
        'Please sign in to cancel your subscription.',
        'You need to be signed in to manage your subscription settings.',
      );
      return;
    }

    setShowCancelConfirm(true);
  };

  const confirmCancelSubscription = async () => {
    setShowCancelConfirm(false);

    if (!user?.email) {
      return;
    }

    try {
      await cancelSubscription(false);
      stripeStatusModalActions.showSuccess(
        '✅ Subscription Canceled',
        'Your subscription has been successfully canceled.',
        "You'll continue to have access until the end of your current billing period.",
      );
      reloadAccountData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      stripeStatusModalActions.showError(
        'Cancellation Failed',
        "We couldn't cancel your subscription at this time.",
        'Please try again in a few moments, or contact support if the issue persists.',
      );
    }
  };

  const handleManageBilling = async () => {
    setLoadingBilling(true);
    if (!user?.email) {
      stripeStatusModalActions.showError(
        'Sign In Required',
        'Please sign in to manage your subscription.',
        'You need to be signed in to access your billing portal.',
      );
      return;
    }

    try {
      await manageBilling();
      if (window.analytics) {
        window.analytics.track('Clicked Manage Billing button', {
          timestamp: new Date().toISOString(),
          userId: user?.id,
          email: user?.email,
        });
      }
      setLoadingBilling(false);
    } catch (error) {
      console.error('Error opening billing portal:', error);
      stripeStatusModalActions.showError(
        'Billing Portal Unavailable',
        "We couldn't open your billing portal right now.",
        'Please try again in a few moments, or contact support if the issue persists.',
      );
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleViewPlans = () => {
    accountModalStore.open('billing');
  };

  if (loading) {
    return (
      <div
        className={classNames(
          'bg-card p-6 sm:p-8 max-w-4xl w-full border border-border/50 overflow-y-auto max-h-[95vh] transition-all duration-300 relative',
          {
            'rounded-b-2xl': isSmallViewport,
            'rounded-r-2xl': !isSmallViewport,
          },
        )}
      >
        <div className="text-center py-16 bg-muted rounded-md border border-border/30">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border/50">
            <div className="w-8 h-8 border-2 border-border/30 border-t-primary rounded-full animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading Account Data</h3>
          <p className="text-muted-foreground">Fetching your subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'bg-card p-6 sm:p-8 max-w-4xl w-full border border-border/50 overflow-y-auto h-full transition-all duration-300 relative',
        {
          'rounded-b-md': isSmallViewport,
          'rounded-r-md': !isSmallViewport,
        },
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center mb-8">
        <div className="mb-8">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border/50">
            <UserIcon className="text-foreground" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Account</h1>
          <p className="text-muted-foreground text-sm">{user?.email ?? 'unknown'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <div className="flex flex-col items-center bg-card rounded-md p-6 border border-border/50">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center border border-border/50">
                <Crown className="text-foreground" size={20} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              {stripeSubscription ? (
                <>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {stripeSubscription.tier === 'builder' ? '$20' : '$0'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2 font-medium">per month</div>
                  <div className="w-full text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border/30">
                    {stripeSubscription.tier.charAt(0).toUpperCase() + stripeSubscription.tier.slice(1)} Plan
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Next billing:{' '}
                    {stripeSubscription.currentPeriodEnd
                      ? new Date(stripeSubscription.currentPeriodEnd).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  {stripeSubscription.cancelAtPeriodEnd && (
                    <div className="text-xs text-muted-foreground mt-1">Cancels at period end</div>
                  )}

                  {!stripeSubscription.cancelAtPeriodEnd && (
                    <Button
                      onClick={handleCancelSubscription}
                      variant="outline"
                      size="sm"
                      className="mt-3 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-muted-foreground mb-2">
                    You are on the Free Plan
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Upgrade to builder plan to build unlimited apps
                  </div>
                  <Button onClick={handleViewPlans} className="gap-2">
                    <Crown size={16} />
                    <span>View Plans</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {stripeSubscription && !loading && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 p-6 bg-card rounded-md border border-border/30">
            {stripeSubscription && !loading && (
              <Button onClick={handleManageBilling} disabled={loadingBilling} className="gap-2">
                <Settings size={16} />
                <span>Manage Billing</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmCancelModal
        isOpen={showCancelConfirm}
        onConfirm={confirmCancelSubscription}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};
