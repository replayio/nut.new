import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Server-side version of callNutAPI that accepts a userId parameter
async function callNutAPIWithUserId(method: string, request: any): Promise<any> {
  const url = `https://dispatch.replay.io/nut/${method}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-user-id': request.userId ?? '',
  };

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`NutAPI call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Peanut amounts for each subscription tier
const SUBSCRIPTION_PEANUTS = {
  free: 500,
  starter: 2000,
  builder: 5000,
  pro: 12000,
} as const;

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { userEmail, userId } = body;

    if (!userEmail || !userId) {
      return new Response(JSON.stringify({ error: 'User email and ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // No customer found - clear any existing subscription
      await callNutAPIWithUserId('set-peanuts-subscription', {
        userId,
        peanuts: undefined,
      });

      return new Response(
        JSON.stringify({
          synced: true,
          hasSubscription: false,
          message: 'No Stripe customer found - cleared subscription',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription - clear any existing subscription
      await callNutAPIWithUserId('set-peanuts-subscription', {
        userId,
        peanuts: undefined,
      });

      return new Response(
        JSON.stringify({
          synced: true,
          hasSubscription: false,
          message: 'No active subscription - cleared subscription',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;
    const createdAt = new Date(subscription.created).toISOString();

    // Map price ID to tier using environment variables
    let tier: keyof typeof SUBSCRIPTION_PEANUTS | null = null;

    if (priceId === process.env.STRIPE_PRICE_FREE) {
      tier = 'free';
    } else if (priceId === process.env.STRIPE_PRICE_STARTER) {
      tier = 'starter';
    } else if (priceId === process.env.STRIPE_PRICE_BUILDER) {
      tier = 'builder';
    } else if (priceId === process.env.STRIPE_PRICE_PRO) {
      tier = 'pro';
    }

    if (!tier) {
      console.error('Unknown subscription tier for price:', priceId);
      return new Response(
        JSON.stringify({
          synced: false,
          error: `Unknown price ID: ${priceId}`,
          hasSubscription: false,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const peanuts = SUBSCRIPTION_PEANUTS[tier];

    // Sync the subscription in your system
    await callNutAPIWithUserId('set-peanuts-subscription', {
      userId,
      peanuts,
      createdAt,
    });

    return new Response(
      JSON.stringify({
        synced: true,
        hasSubscription: true,
        tier,
        peanuts,
        createdAt,
        message: `Synced ${tier} subscription (${peanuts} peanuts)`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return new Response(
      JSON.stringify({
        synced: false,
        error: 'Failed to sync subscription',
        hasSubscription: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
