import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { refreshPeanutsStore } from '~/lib/stores/peanuts';
import { stripeStatusModalActions } from '~/lib/stores/stripeStatusModal';
import { SUBSCRIPTION_TIERS } from '~/lib/stripe/client';

const TOPOFF_PEANUTS = 2000; // 2,000 peanuts for $20 top-off

/**
 * Hook to handle Stripe success/cancel callbacks from URL params
 */
export function useStripeCallback() {
  const user = useStore(userStore);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeCanceled = urlParams.get('stripe_canceled');
    const tier = urlParams.get('tier');

    const handleStripeCallback = async () => {
      if (stripeSuccess === 'topoff') {
        try {
          console.log(`Processing peanut top-up for user ${user.id}`);

          // Add peanuts directly via API
          await callNutAPI('add-peanuts', {
            userId: user.id,
            peanuts: TOPOFF_PEANUTS,
          });

          console.log(`✅ Successfully added ${TOPOFF_PEANUTS} peanuts for user ${user.id}`);

          // Refresh peanuts store to show updated balance
          await refreshPeanutsStore();

          // Show success modal
          stripeStatusModalActions.showSuccess(
            '🥜 Peanuts Added Successfully!',
            `${TOPOFF_PEANUTS.toLocaleString()} peanuts have been added to your account.`,
            'Your peanut balance has been updated and is ready to use for building amazing apps!',
          );
        } catch (error) {
          console.error('❌ Error adding peanuts:', error);
          stripeStatusModalActions.showError(
            'Failed to Add Peanuts',
            'There was an error processing your peanut top-off.',
            "Your payment was processed successfully, but we couldn't add the peanuts to your account. Please contact support and we'll resolve this quickly.",
          );
        }

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('stripe_success');
        newUrl.searchParams.delete('tier');
        window.history.replaceState({}, '', newUrl.toString());
      } else if (stripeSuccess === 'subscription') {
        // Handle successful subscription with tier information
        let message = 'Your subscription has been successfully activated.';
        let details =
          'Your monthly peanuts will be available shortly and will automatically renew each billing period.';

        if (tier && tier in SUBSCRIPTION_TIERS) {
          const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

          try {
            console.log(`Processing ${tier} subscription activation for user ${user.id}`);

            // Set the subscription in the backend
            await callNutAPI('set-peanuts-subscription', {
              userId: user.id,
              peanuts: tierInfo.peanuts,
            });

            console.log(`✅ Successfully set ${tier} subscription (${tierInfo.peanuts} peanuts) for user ${user.id}`);

            // Refresh peanuts store to show updated balance
            await refreshPeanutsStore();

            message = `Your ${tierInfo.name} subscription has been successfully activated!`;
            details = `You'll receive ${tierInfo.peanuts.toLocaleString()} peanuts every month for $${tierInfo.price}. Your subscription is now active and ready to use!`;

            if (window.analytics) {
              window.analytics.track('User Subscribed', {
                userId: user.id,
                email: user.email,
                tier,
                peanuts: tierInfo.peanuts,
                price: tierInfo.price,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('❌ Error setting subscription:', error);
            message = 'Your subscription payment was successful, but there was an issue activating it.';
            details =
              "Please contact support and we'll resolve this quickly. Your subscription is valid and no additional payment is needed.";
          }
        }

        // Refresh peanuts store after a short delay to allow webhook processing
        setTimeout(async () => {
          try {
            await refreshPeanutsStore();
          } catch (error) {
            console.error('Error refreshing peanuts after subscription:', error);
          }
        }, 2000);

        stripeStatusModalActions.showSuccess('🎉 Subscription Activated!', message, details);

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('stripe_success');
        newUrl.searchParams.delete('tier');
        window.history.replaceState({}, '', newUrl.toString());
      } else if (stripeCanceled) {
        // Handle canceled checkout
        const type = stripeCanceled === 'topoff' ? 'Peanut top-off' : 'Subscription';
        stripeStatusModalActions.showInfo(
          'Checkout Canceled',
          `${type} was canceled before completion.`,
          "No charges were made to your payment method. You can try again whenever you're ready.",
        );

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('stripe_canceled');
        newUrl.searchParams.delete('tier');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };

    // Only run once when component mounts and user is available
    handleStripeCallback();
  }, [user?.id]); // Only depend on user.id to avoid running multiple times
}
