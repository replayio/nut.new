import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'User email is required' }), {
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
      return new Response(
        JSON.stringify({
          hasSubscription: false,
          subscription: null,
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
      return new Response(
        JSON.stringify({
          hasSubscription: false,
          subscription: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    // Map price ID to tier using environment variables
    let tier = 'unknown';
    let peanuts = 0;

    if (priceId === process.env.STRIPE_PRICE_FREE) {
      tier = 'free';
      peanuts = 500;
    } else if (priceId === process.env.STRIPE_PRICE_STARTER) {
      tier = 'starter';
      peanuts = 2000;
    } else if (priceId === process.env.STRIPE_PRICE_BUILDER) {
      tier = 'builder';
      peanuts = 5000;
    } else if (priceId === process.env.STRIPE_PRICE_PRO) {
      tier = 'pro';
      peanuts = 12000;
    }

    const result = {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier,
        peanuts,
        currentPeriodStart: (subscription as any).current_period_start
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check subscription status',
        hasSubscription: false,
        subscription: null,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
