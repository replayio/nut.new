import Stripe from 'stripe';
import { callNutAPI } from '~/lib/replay/NutAPI';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

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
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle recurring subscription payments (not initial payments)
        if ((invoice as any).subscription && invoice.billing_reason === 'subscription_cycle') {
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
