import { useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import {
  SUBSCRIPTION_TIERS,
  createSubscriptionCheckout,
  type SubscriptionTier,
  manageSubscription,
} from '~/lib/stripe/client';
import { classNames } from '~/utils/classNames';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import { Info, Gift, Rocket, Check, Sparkles } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

export function SubscriptionModal() {
  const { isMobile } = useIsMobile();
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const stripeSubscription = useStore(subscriptionStore.subscription);
  const user = useStore(userStore);

  const currentTier = stripeSubscription ? stripeSubscription.tier : 'free';

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user?.id || !user?.email) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (tier === currentTier) {
      toast.info('You are already subscribed to this tier');
      return;
    }

    setLoading(tier);

    try {
      await createSubscriptionCheckout(tier);
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription. Please try again.');
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    await manageSubscription();
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={classNames(
          'bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor max-w-6xl w-full h-full overflow-y-auto',
          {
            'rounded-b-md': isMobile,
            'rounded-r-md': !isMobile,
          },
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor">
          <div>
            <h2 className="text-2xl font-bold text-bolt-elements-textHeading">Choose Your Plan</h2>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">
              Select a subscription tier that fits your needs
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {(
              Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]][]
            ).map(([tier, details]) => {
              const isCurrentTier = tier === currentTier;
              const isLoading = loading === tier;
              const isFree = tier === 'free';

              return (
                <div
                  key={tier}
                  className={classNames(
                    'relative p-6 rounded-md border transition-colors min-h-[400px] flex flex-col',
                    {
                      'border-primary bg-accent': isCurrentTier,
                      'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2':
                        !isCurrentTier,
                    },
                  )}
                >
                  {isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
                        ✓ Current Subscription
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor flex items-center justify-center">
                      {isFree ? (
                        <Gift className="text-bolt-elements-textPrimary" size={20} />
                      ) : (
                        <Rocket className="text-bolt-elements-textPrimary" size={20} />
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-bolt-elements-textHeading">
                      {details.name}
                      {isCurrentTier && <span className="ml-2">✓</span>}
                    </h3>
                    <div className="text-4xl font-bold text-bolt-elements-textHeading mb-2">
                      ${details.price}
                      <span className="text-lg font-normal text-bolt-elements-textSecondary">/month</span>
                    </div>
                    <p className="text-sm text-bolt-elements-textSecondary leading-relaxed px-2">
                      {details.description}
                    </p>
                  </div>

                  <div className="space-y-3 mb-8 flex-grow">
                    {details.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center mt-0.5 flex-shrink-0 border border-bolt-elements-borderColor">
                          <Check className="text-bolt-elements-textPrimary" size={12} />
                        </div>
                        <span className="text-sm text-bolt-elements-textSecondary leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <Button
                      onClick={!stripeSubscription ? () => handleSubscribe(tier) : () => handleManageSubscription()}
                      disabled={isCurrentTier || isLoading}
                      variant={isCurrentTier ? 'outline' : 'default'}
                      className="w-full h-12"
                    >
                      {isLoading && (
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2"></div>
                      )}
                      {isCurrentTier
                        ? '✓ Current Plan'
                        : isLoading
                          ? 'Processing...'
                          : tier === 'free'
                            ? 'Downgrade Subscription'
                            : 'Upgrade Subscription'}
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="relative min-h-[400px]">
              <div className="h-full p-6 rounded-md bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center border border-bolt-elements-borderColor">
                    <Sparkles className="text-bolt-elements-textPrimary" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-bolt-elements-textHeading mb-3">Pro</h3>
                  <div className="text-2xl font-bold text-muted-foreground mb-2">Coming Soon</div>
                  <p className="text-sm text-bolt-elements-textSecondary leading-relaxed px-2">
                    Build apps effortlessly
                  </p>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center mt-0.5 flex-shrink-0 border border-bolt-elements-borderColor">
                      <Sparkles className="text-bolt-elements-textPrimary" size={12} />
                    </div>
                    <span className="text-sm text-bolt-elements-textSecondary leading-relaxed">
                      Guaranteed Reliability
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center mt-0.5 flex-shrink-0 border border-bolt-elements-borderColor">
                      <Sparkles className="text-bolt-elements-textPrimary" size={12} />
                    </div>
                    <span className="text-sm text-bolt-elements-textSecondary leading-relaxed">
                      Up Front App Prices
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center mt-0.5 flex-shrink-0 border border-bolt-elements-borderColor">
                      <Sparkles className="text-bolt-elements-textPrimary" size={12} />
                    </div>
                    <span className="text-sm text-bolt-elements-textSecondary leading-relaxed">Priority Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pt-2 pb-6">
          <div className="p-4 sm:p-6 bg-bolt-elements-background-depth-1 rounded-md border border-bolt-elements-borderColor">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-bolt-elements-background-depth-2 flex items-center justify-center mt-1 flex-shrink-0 border border-bolt-elements-borderColor">
                <Info className="text-bolt-elements-textPrimary" size={16} />
              </div>
              <div className="text-sm text-bolt-elements-textSecondary">
                <p className="font-semibold text-bolt-elements-textHeading mb-3 text-base">Important Notes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 gap-x-6">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>You can upgrade or cancel your plan at any time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>Cancellation takes effect at the end of your current billing period</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>All plans include access to all Replay Builder features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
