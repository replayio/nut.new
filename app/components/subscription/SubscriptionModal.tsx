import { useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { SUBSCRIPTION_TIERS, createSubscriptionCheckout, type SubscriptionTier } from '~/lib/stripe/client';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: SubscriptionTier;
}

export function SubscriptionModal({ isOpen, onClose, currentTier }: SubscriptionModalProps) {
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const user = useStore(userStore);

  if (!isOpen) {
    return null;
  }

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
      await createSubscriptionCheckout(tier, user.id, user.email);
      // User will be redirected to Stripe Checkout
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription. Please try again.');
      setLoading(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-bolt-elements-background-depth-1 rounded-2xl border border-bolt-elements-borderColor shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor/50">
          <div>
            <h2 className="text-2xl font-bold text-bolt-elements-textHeading">Choose Your Plan</h2>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">
              Select a subscription tier that fits your needs
            </p>
          </div>

          <IconButton
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Close modal"
            icon="i-ph:x"
            size="xxl"
          />
        </div>

        {/* Important Notes - Moved to top */}
        <div className="px-6 sm:px-8 pt-2 pb-6">
          <div className="p-4 sm:p-6 bg-gradient-to-r from-bolt-elements-background-depth-2/30 to-bolt-elements-background-depth-3/20 rounded-2xl border border-bolt-elements-borderColor/30 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center mt-1 flex-shrink-0 border border-blue-500/30 shadow-sm">
                <div className="i-ph:info text-blue-500 text-lg"></div>
              </div>
              <div className="text-sm text-bolt-elements-textSecondary">
                <p className="font-semibold text-bolt-elements-textHeading mb-3 text-base">Important Notes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 gap-x-6">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>Peanuts do not roll over between billing cycles</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>You can upgrade or downgrade your plan at any time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>Cancellation takes effect at the end of your current billing period</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-bolt-elements-textSecondary/40 mt-2 flex-shrink-0"></div>
                    <span>All plans include access to all Nut features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {(
              Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]][]
            ).map(([tier, details]) => {
              const isCurrentTier = tier === currentTier;
              const isLoading = loading === tier;
              const isPro = tier === 'pro';
              const isFree = tier === 'free';

              return (
                <div
                  key={tier}
                  className={classNames(
                    'relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-105 group min-h-[400px] flex flex-col',
                    {
                      'border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-lg':
                        isCurrentTier,
                      'border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 ring-2 ring-purple-500/20 shadow-lg':
                        isPro && !isCurrentTier,
                      'border-bolt-elements-borderColor/50 bg-gradient-to-br from-bolt-elements-background-depth-2/30 to-bolt-elements-background-depth-3/20 shadow-sm':
                        !isCurrentTier && !isPro,
                      'hover:border-bolt-elements-borderColor/70 hover:shadow-lg': !isCurrentTier,
                    },
                  )}
                >
                  {isPro && !isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  {isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        CURRENT PLAN
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-bolt-elements-background-depth-3/50 to-bolt-elements-background-depth-2/30 border border-bolt-elements-borderColor/30 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                      <div
                        className={classNames('text-2xl transition-transform duration-300 group-hover:scale-110', {
                          'i-ph:gift text-green-500': isFree,
                          'i-ph:rocket-launch text-blue-500': tier === 'starter',
                          'i-ph:lightning text-orange-500': tier === 'builder',
                          'i-ph:crown text-purple-500': isPro,
                        })}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-bolt-elements-textHeading mb-3 transition-transform duration-300 group-hover:scale-105">
                      {details.name}
                    </h3>
                    <div className="text-4xl font-bold text-bolt-elements-textHeading mb-2 transition-transform duration-300 group-hover:scale-105">
                      ${details.price}
                      <span className="text-lg font-normal text-bolt-elements-textSecondary">/month</span>
                    </div>
                    <p className="text-sm text-bolt-elements-textSecondary leading-relaxed px-2">
                      {details.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8 flex-grow">
                    {details.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 group/feature">
                        <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center mt-0.5 flex-shrink-0 border border-green-500/30 transition-all duration-200 group-hover/feature:scale-110 group-hover/feature:bg-green-500/30">
                          <div className="i-ph:check text-green-500 text-sm transition-transform duration-200 group-hover/feature:scale-110"></div>
                        </div>
                        <span className="text-sm text-bolt-elements-textSecondary leading-relaxed transition-colors duration-200 group-hover/feature:text-bolt-elements-textPrimary">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe Button */}
                  <div className="mt-auto">
                    <button
                      onClick={() => handleSubscribe(tier)}
                      disabled={isCurrentTier || isLoading}
                      className={classNames(
                        'w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl group/btn min-h-[56px]',
                        {
                          'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 border border-green-500/30 cursor-not-allowed':
                            isCurrentTier,
                          'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border border-purple-500/50 hover:border-purple-400 hover:scale-105':
                            isPro && !isCurrentTier && !isLoading,
                          'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border border-blue-500/50 hover:border-blue-400 hover:scale-105':
                            !isPro && !isFree && !isCurrentTier && !isLoading,
                          'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border border-green-500/50 hover:border-green-400 hover:scale-105':
                            isFree && !isCurrentTier && !isLoading,
                          'opacity-50 cursor-not-allowed hover:scale-100': isLoading,
                        },
                      )}
                    >
                      {isLoading && (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      )}
                      <span className="transition-transform duration-300 group-hover/btn:scale-105">
                        {isCurrentTier ? '✓ Current Plan' : isLoading ? 'Processing...' : 'Subscribe'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
