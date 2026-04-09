import Stripe from 'stripe';

const API_VERSION = '2025-07-30.basil' as const;

let cached: Stripe | undefined;

/**
 * Stripe client when STRIPE_SECRET_KEY is set; otherwise null.
 * Does not run at import time — safe for Vite SSR when env is missing (e.g. CI / e2e).
 */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return null;
  }
  if (!cached) {
    cached = new Stripe(key, { apiVersion: API_VERSION });
  }
  return cached;
}
