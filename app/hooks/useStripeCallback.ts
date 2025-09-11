import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { refreshPeanutsStore } from '~/lib/stores/peanuts';
import { stripeStatusModalActions } from '~/lib/stores/stripeStatusModal';

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

    const handleStripeCallback = async () => {
      if (stripeSuccess === 'topoff') {
        try {
          // Add peanuts directly via API
          await callNutAPI('add-peanuts', {
            userId: user.id,
            peanuts: TOPOFF_PEANUTS,
          });

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
        window.history.replaceState({}, '', newUrl.toString());
      } else if (stripeCanceled) {
        const type = stripeCanceled === 'topoff' ? 'Peanut top-off' : 'Subscription';
        stripeStatusModalActions.showInfo(
          'Checkout Canceled',
          `${type} was canceled before completion.`,
          "No charges were made to your payment method. You can try again whenever you're ready.",
        );

        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('stripe_canceled');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };

    handleStripeCallback();
  }, [user?.id]);
}
