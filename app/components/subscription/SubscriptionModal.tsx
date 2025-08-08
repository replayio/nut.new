import { useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { SUBSCRIPTION_TIERS, createSubscriptionCheckout, type SubscriptionTier } from '~/lib/stripe/client';
import { classNames } from '~/utils/classNames';

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

          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Close modal"
          >
            <div className="i-ph:x text-xl"></div>
          </button>
        </div>

        {/* Subscription Tiers */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]][]
            ).map(([tier, details]) => {
              const isCurrentTier = tier === currentTier;
              const isLoading = loading === tier;
              const isPro = tier === 'pro';

              return (
                <div
                  key={tier}
                  className={classNames('relative p-6 rounded-xl border transition-all duration-200 hover:shadow-lg', {
                    'border-green-500/50 bg-green-500/5': isCurrentTier,
                    'border-purple-500/50 bg-purple-500/5 ring-2 ring-purple-500/20': isPro && !isCurrentTier,
                    'border-bolt-elements-borderColor bg-bolt-elements-background-depth-2/30': !isCurrentTier && !isPro,
                    'hover:border-bolt-elements-borderColor/70': !isCurrentTier,
                  })}
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

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-bolt-elements-textHeading mb-2">{details.name}</h3>
                    <div className="text-3xl font-bold text-bolt-elements-textHeading mb-1">
                      ${details.price}
                      <span className="text-sm font-normal text-bolt-elements-textSecondary">/month</span>
                    </div>
                    <p className="text-sm text-bolt-elements-textSecondary">{details.description}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {details.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <div className="i-ph:check text-green-500 text-sm"></div>
                        </div>
                        <span className="text-sm text-bolt-elements-textSecondary">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={isCurrentTier || isLoading}
                    className={classNames(
                      'w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2',
                      {
                        'bg-green-500/20 text-green-500 cursor-not-allowed': isCurrentTier,
                        'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105':
                          isPro && !isCurrentTier && !isLoading,
                        'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105':
                          !isPro && !isCurrentTier && !isLoading,
                        'opacity-50 cursor-not-allowed': isLoading,
                      },
                    )}
                  >
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                    {isCurrentTier ? 'Current Plan' : isLoading ? 'Processing...' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-bolt-elements-background-depth-2/50 rounded-xl border border-bolt-elements-borderColor/30">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="i-ph:info text-blue-500 text-sm"></div>
              </div>
              <div className="text-sm text-bolt-elements-textSecondary">
                <p className="font-medium text-bolt-elements-textPrimary mb-1">Important Notes:</p>
                <ul className="space-y-1">
                  <li>• Peanuts do not roll over between billing cycles</li>
                  <li>• You can upgrade or downgrade your plan at any time</li>
                  <li>• Cancellation takes effect at the end of your current billing period</li>
                  <li>• All plans include access to all Nut features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
