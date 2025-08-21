import { loadStripe } from '@stripe/stripe-js';
import { sessionStore } from '~/lib/stores/auth';

// Initialize Stripe with your publishable key (lazy loading)
let stripePromise: Promise<any> | null = null;

const getStripeKey = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const key = (window as any).ENV?.STRIPE_TEST_PUBLISHABLE_KEY;
  console.log('Stripe key from ENV:', key ? `${key.substring(0, 8)}...` : 'undefined');
  return key || '';
};

const initializeStripe = () => {
  if (!stripePromise) {
    const key = getStripeKey();
    if (!key) {
      console.error('Stripe publishable key not found in window.ENV');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// Helper function to get auth headers
function getAuthHeaders() {
  const session = sessionStore.get();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return headers;
}

export interface CreateCheckoutSessionParams {
  type: 'subscription' | 'topoff';
  tier?: 'free' | 'starter';
  userId: string;
  userEmail: string;
  returnUrl?: string; // Optional return URL to redirect to after checkout
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Creates a Stripe checkout session and redirects the user
 */
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<void> {
  try {
    // Create checkout session via API
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url }: CheckoutSessionResponse = await response.json();

    if (!url) {
      throw new Error('No checkout URL received');
    }

    // Redirect to Stripe Checkout
    window.location.href = url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create subscription checkout for a specific tier
 */
export async function createSubscriptionCheckout(
  tier: 'free' | 'starter',
  userId: string,
  userEmail: string,
): Promise<void> {
  return createCheckoutSession({
    type: 'subscription',
    tier,
    userId,
    userEmail,
    returnUrl: window.location.href, // Return to current page after checkout
  });
}

/**
 * Create peanut top-off checkout
 */
export async function createTopoffCheckout(userId: string, userEmail: string): Promise<void> {
  return createCheckoutSession({
    type: 'topoff',
    userId,
    userEmail,
    returnUrl: window.location.href, // Return to current page after checkout
  });
}

/**
 * Get Stripe instance for advanced usage
 */
export async function getStripe() {
  return await initializeStripe();
}

// Subscription tier information
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    peanuts: 500,
    description: 'Our free tier to get you started.',
    features: ['500 Peanuts per month'],
  },
  starter: {
    name: 'Builder',
    price: 20,
    peanuts: 2000,
    description: 'No limits on any features. Go nuts!',
    features: ['2000 Peanuts per month (rolls over)', 'Pay-as-you-go to top off balance'],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Check subscription status directly from Stripe
 */
export async function checkSubscriptionStatus() {
  try {
    const response = await fetch('/api/stripe/manage-subscription', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'get_status' }),
    });

    if (!response.ok) {
      throw new Error('Failed to check subscription status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { hasSubscription: false, subscription: null };
  }
}

// Note: syncSubscription removed - webhooks now handle all syncing automatically

/**
 * Cancel subscription
 */
export async function cancelSubscription(immediate: boolean = false) {
  try {
    const response = await fetch('/api/stripe/manage-subscription', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'cancel' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel subscription');
    }

    const data = await response.json();
    console.log('Subscription cancellation result:', data.message);
    return data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}
