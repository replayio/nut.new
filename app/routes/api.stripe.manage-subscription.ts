import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { callNutAPI } from '~/lib/replay/NutAPI';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Helper function to get authenticated user
async function getAuthenticatedUser(request: Request) {
  // Get the authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 🔒 SECURITY: Authenticate the user
  const user = await getAuthenticatedUser(request);
  if (!user || !user.email) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action: requestAction, immediate, returnUrl } = body;
    const targetUrl = returnUrl ? decodeURIComponent(returnUrl) : new URL(request.url).origin;

    switch (requestAction) {
      case 'cancel':
        return await handleCancelSubscription(user.email, user.id, immediate);

      case 'get_status':
        return await handleGetSubscriptionStatus(user.email);

      case 'manage-billing':
        return await handleManageBilling(user.email, targetUrl);

      case 'manage-subscription':
        return await handleManageSubscription(user.email, targetUrl);

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in subscription management:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Internal function to cancel subscription (triggers webhook)
async function handleCancelSubscription(userEmail: string, userId: string, immediate: boolean = false) {
  try {
    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: 'No customer found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscription = subscriptions.data[0];

    let message: string;

    if (immediate) {
      // Cancel immediately (this will trigger webhook events)
      await stripe.subscriptions.cancel(subscription.id);

      await callNutAPI(
        'set-peanuts-subscription',
        {
          userId,
          peanuts: undefined,
        },
        undefined, // no streaming callback
        userId, // use this userId instead of session-based lookup
      );

      message = 'Subscription canceled immediately';
      console.log(`🔄 Immediately canceled subscription ${subscription.id} - webhook will process`);
    } else {
      // Cancel at period end (this will trigger webhook events)
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      message = 'Subscription will cancel at the end of current billing period';
      console.log(`🔄 Scheduled cancellation for subscription ${subscription.id} at period end - webhook will process`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Internal function to get subscription status from Stripe
async function handleGetSubscriptionStatus(userEmail: string) {
  try {
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
      tier = 'builder';
      peanuts = 2000;
    } else if (priceId === process.env.STRIPE_PRICE_PRO) {
      tier = 'pro';
      peanuts = 12000;
    }

    // Get period dates from subscription items (they have the actual billing periods)
    const subscriptionItem = subscription.items.data[0];
    const currentPeriodStart = subscriptionItem?.current_period_start;
    const currentPeriodEnd = subscriptionItem?.current_period_end;

    const result = {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier,
        peanuts,
        currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
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

async function handleManageBilling(userEmail: string, targetUrl: string) {
  const customers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return new Response(JSON.stringify({ error: 'No customer found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const customer = customers.data[0];

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: targetUrl,
  });

  return new Response(JSON.stringify({ success: true, url: portalSession.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleManageSubscription(userEmail: string, targetUrl: string) {
  const customers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return new Response(JSON.stringify({ error: 'No customer found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const customer = customers.data[0];

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 1,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: targetUrl,
    flow_data: {
      type: 'subscription_update',
      subscription_update: {
        subscription: subscriptions?.data?.[0]?.id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          return_url: targetUrl,
        },
      },
    },
  });

  return new Response(JSON.stringify({ success: true, url: portalSession.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
