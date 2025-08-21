import Stripe from 'stripe';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Peanut amounts for each subscription tier
const SUBSCRIPTION_PEANUTS = {
  free: 500,
  starter: 2000,
  builder: 5000,
  pro: 12000,
} as const;

// Utility function to get userId from customer
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      console.error('Customer not found:', customerId);
      return null;
    }

    let userId = customer.metadata?.userId;
    
    // If no userId in metadata, try to find it by email in other customers
    if (!userId && customer.email) {
      console.log(`No userId in customer metadata, searching by email: ${customer.email}`);
      
      const customersWithEmail = await stripe.customers.list({
        email: customer.email,
        limit: 10,
      });
      
      // Find a customer with userId metadata
      const customerWithUserId = customersWithEmail.data.find(c => c.metadata?.userId);
      if (customerWithUserId) {
        userId = customerWithUserId.metadata.userId;
        
        // Update current customer with the userId for future use
        await stripe.customers.update(customerId, {
          metadata: {
            ...customer.metadata,
            userId,
          },
        });
        
        console.log(`Found userId ${userId} from customer ${customerWithUserId.id}, updated current customer`);
      }
    }
    
    return userId || null;
  } catch (error) {
    console.error('Error getting userId from customer:', error);
    return null;
  }
}

// Utility function to get peanuts from price ID
function getPeanutsFromPriceId(priceId: string): number {
  if (priceId === process.env.STRIPE_PRICE_FREE) return SUBSCRIPTION_PEANUTS.free;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return SUBSCRIPTION_PEANUTS.starter;
  if (priceId === process.env.STRIPE_PRICE_BUILDER) return SUBSCRIPTION_PEANUTS.builder;
  if (priceId === process.env.STRIPE_PRICE_PRO) return SUBSCRIPTION_PEANUTS.pro;
  return 0;
}

// Utility function to get tier from price ID
function getTierFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_FREE) return 'free';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_BUILDER) return 'builder';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return 'unknown';
}

export async function action({ request }: { request: Request }) {
  console.log('🎯 Webhook endpoint hit - method:', request.method);
  
  if (request.method !== 'POST') {
    console.error('❌ Method not allowed:', request.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('📝 Webhook details:', {
    bodyLength: body.length,
    hasSignature: !!signature,
    hasWebhookSecret: !!WEBHOOK_SECRET,
    webhookSecretLength: WEBHOOK_SECRET ? WEBHOOK_SECRET.length : 0,
  });

  if (!signature) {
    console.error('❌ No Stripe signature found in headers');
    return new Response(JSON.stringify({ error: 'No signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET environment variable not set');
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;

  try {
    // TEMPORARY: Skip signature verification for testing
    if (process.env.NODE_ENV === 'development' && !WEBHOOK_SECRET) {
      console.log('⚠️ DEVELOPMENT MODE: Skipping webhook signature verification');
      event = JSON.parse(body);
    } else {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
      console.log('✅ Webhook signature verified successfully');
    }
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    console.error('Signature received:', signature);
    console.error('Body preview:', body.substring(0, 200) + '...');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('📧 Stripe webhook received:', {
    type: event.type,
    id: event.id,
    created: new Date(event.created * 1000).toISOString(),
  });

  try {
    switch (event.type) {
      // Subscription lifecycle events
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPaused(subscription);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionResumed(subscription);
        break;
      }

      // Payment events
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // Checkout events (for one-time top-offs)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handler for subscription creation (initial setup)
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) return;

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.error('No price ID found in subscription:', subscription.id);
      return;
    }

    const peanuts = getPeanutsFromPriceId(priceId);
    const tier = getTierFromPriceId(priceId);

    if (peanuts === 0) {
      console.error(`❌ Unknown price ID: ${priceId}`);
      return;
    }

    // Set initial subscription and peanuts
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts,
    });

    console.log(`✅ Created ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

// Handler for subscription updates (tier changes)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) return;

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.error('No price ID found in subscription:', subscription.id);
      return;
    }

    const peanuts = getPeanutsFromPriceId(priceId);
    const tier = getTierFromPriceId(priceId);

    if (peanuts === 0) {
      console.error(`❌ Unknown price ID: ${priceId}`);
      return;
    }

    // Update subscription tier and peanuts
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts,
    });

    console.log(`✅ Updated to ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Handler for subscription cancellation
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) return;

    // Clear the subscription
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts: undefined,
    });

    console.log(`✅ Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Handler for subscription pausing (payment failures)
async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) return;

    // Pause subscription but don't clear peanuts yet
    console.log(`⏸️ Paused subscription for user ${userId} due to payment failure`);
    
    // You might want to send a notification here or set a flag
    // For now, we'll keep the subscription active but log the pause
  } catch (error) {
    console.error('Error handling subscription pause:', error);
  }
}

// Handler for subscription resuming (payment method updated)
async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) return;

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.error('No price ID found in subscription:', subscription.id);
      return;
    }

    const peanuts = getPeanutsFromPriceId(priceId);
    const tier = getTierFromPriceId(priceId);

    if (peanuts === 0) {
      console.error(`❌ Unknown price ID: ${priceId}`);
      return;
    }

    // Resume subscription with fresh peanuts
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts,
    });

    console.log(`✅ Resumed ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
  } catch (error) {
    console.error('Error handling subscription resume:', error);
  }
}

// Handler for successful payments (renewals and initial)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const userId = await getUserIdFromCustomer(invoice.customer as string);
    if (!userId) return;

    // Only handle subscription renewals (not initial payments)
    if ((invoice as any).subscription && invoice.billing_reason === 'subscription_cycle') {
      const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      
      if (!priceId) {
        console.error('No price ID found in subscription for invoice:', invoice.id);
        return;
      }

      const peanuts = getPeanutsFromPriceId(priceId);
      const tier = getTierFromPriceId(priceId);

      if (peanuts === 0) {
        console.error(`❌ Unknown price ID for renewal: ${priceId}`);
        return;
      }

      // Renew the subscription with fresh peanuts
      await callNutAPI('set-peanuts-subscription', {
        userId,
        peanuts,
      });
      
      console.log(`✅ Renewed ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handler for failed payments
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const userId = await getUserIdFromCustomer(invoice.customer as string);
    if (!userId) return;

    console.log(`❌ Payment failed for user ${userId}, invoice: ${invoice.id}`);
    
    // The subscription will be automatically paused by Stripe
    // We handle the actual pausing in handleSubscriptionPaused
    
    // You might want to send a notification email here
    // or set a flag to show payment failure UI
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handler for completed checkouts (peanut top-offs)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata;
    
    if (!metadata || !session.customer) {
      console.error('Missing metadata or customer in checkout session');
      return;
    }

    const userId = await getUserIdFromCustomer(session.customer as string);
    if (!userId) return;

    // Handle peanut top-offs
    if (metadata.type === 'topoff') {
      const topoffAmount = 2000; // Standard top-off amount
      
      await callNutAPI('add-peanuts', {
        userId,
        peanuts: topoffAmount,
      });
      
      console.log(`✅ Added ${topoffAmount} peanuts via top-off for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}
