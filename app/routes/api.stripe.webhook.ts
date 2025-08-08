import Stripe from 'stripe';
import { callNutAPI } from '~/lib/replay/NutAPI';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Peanut amounts for each subscription tier
const SUBSCRIPTION_PEANUTS = {
  starter: 2000, // 2,000 peanuts per month
  builder: 5000, // 5,000 peanuts per month
  pro: 12000, // 12,000 peanuts per month (20% discount mentioned)
} as const;

const TOPOFF_PEANUTS = 2000; // 2,000 peanuts for $20 top-off

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return new Response(JSON.stringify({ error: 'No signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle recurring subscription payments
        if ((invoice as any).subscription) {
          await handleSubscriptionRenewal(invoice);
        }
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const metadata = session.metadata;

  if (!userId || !metadata) {
    console.error('Missing userId or metadata in checkout session');
    return;
  }

  try {
    // IMPORTANT: Update the customer with userId metadata for future webhooks
    if (session.customer) {
      await stripe.customers.update(session.customer as string, {
        metadata: {
          userId,
        },
      });
      console.log(`Updated customer ${session.customer} with userId ${userId}`);
    }

    if (metadata.type === 'topoff') {
      // Handle one-time peanut purchase
      await callNutAPI('add-peanuts', {
        userId,
        peanuts: TOPOFF_PEANUTS,
      });
      console.log(`Added ${TOPOFF_PEANUTS} peanuts for user ${userId}`);
    } else if (metadata.type === 'subscription' && metadata.tier) {
      // Handle subscription creation - peanuts will be set via subscription webhook
      console.log(`Subscription checkout completed for user ${userId}, tier: ${metadata.tier}`);
    }
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    // Get the customer and find the userId
    const customer = await stripe.customers.retrieve(subscription.customer as string);

    if (!customer || customer.deleted) {
      console.error('Customer not found for subscription:', subscription.id);
      return;
    }

    // Extract userId from customer metadata (you'll need to set this when creating customers)
    const userId = customer.metadata?.userId;
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    // Determine the subscription tier from the price
    const priceId = subscription.items.data[0]?.price.id;
    let tier: keyof typeof SUBSCRIPTION_PEANUTS | null = null;

    if (priceId === 'price_1RtE7hEfKucJn4vkXKpmDNha') {
      tier = 'starter';
    } else if (priceId === 'price_1RtE9TEfKucJn4vkARIPfDb5') {
      tier = 'builder';
    } else if (priceId === 'price_1RtEBDEfKucJn4vkInF3CEvZ') {
      tier = 'pro';
    }

    if (!tier) {
      console.error('Unknown subscription tier for price:', priceId);
      return;
    }

    const peanuts = SUBSCRIPTION_PEANUTS[tier];

    // Set the subscription in your system
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts,
    });

    console.log(`Set ${tier} subscription (${peanuts} peanuts) for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription change:', error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);

    if (!customer || customer.deleted) {
      console.error('Customer not found for canceled subscription:', subscription.id);
      return;
    }

    const userId = customer.metadata?.userId;
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    // Clear the subscription
    await callNutAPI('set-peanuts-subscription', {
      userId,
      peanuts: undefined,
    });

    console.log(`Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handleSubscriptionRenewal(invoice: Stripe.Invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer as string);

    if (!customer || customer.deleted) {
      console.error('Customer not found for invoice:', invoice.id);
      return;
    }

    const userId = customer.metadata?.userId;
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    // The subscription renewal will automatically reload peanuts via your existing system
    console.log(`Subscription renewed for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
  }
}
