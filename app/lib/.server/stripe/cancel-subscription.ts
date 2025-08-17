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
    const { userEmail, immediate = false } = body;

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
          error: 'No customer found with that email',
        }),
        {
          status: 404,
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
          error: 'No active subscription found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const subscription = subscriptions.data[0];

    // Cancel the subscription
    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.id);
      console.log(`Immediately canceled subscription ${subscription.id} for customer ${customer.id}`);
    } else {
      // Cancel at period end (default)
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      console.log(`Set subscription ${subscription.id} to cancel at period end for customer ${customer.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        canceled: true,
        immediate,
        message: immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at the end of current billing period',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to cancel subscription',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
