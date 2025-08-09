// import type { ActionFunctionArgs } from '@remix-run/node';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Product and Price mappings from environment variables
const SUBSCRIPTION_PRICES = {
  free: process.env.STRIPE_PRICE_FREE!,
  starter: process.env.STRIPE_PRICE_STARTER!,
  builder: process.env.STRIPE_PRICE_BUILDER!,
  pro: process.env.STRIPE_PRICE_PRO!,
} as const;

const PEANUT_TOPOFF_PRICE = process.env.STRIPE_PRICE_TOPOFF!;

interface CreateCheckoutRequest {
  type: 'subscription' | 'topoff';
  tier?: 'free' | 'starter' | 'builder' | 'pro';
  userId: string;
  userEmail: string;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as CreateCheckoutRequest;
    const { type, tier, userId, userEmail } = body;

    // Validate required fields
    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'User ID and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let priceId: string;
    let mode: 'subscription' | 'payment';
    let successUrl: string;
    let cancelUrl: string;

    const baseUrl = new URL(request.url).origin;

    // Try to find existing customer by email to avoid duplicates
    let customerId: string | undefined;
    try {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log(`Reusing existing customer: ${customerId} for email: ${userEmail}`);

        // Update customer metadata with userId
        await stripe.customers.update(customerId, {
          metadata: {
            userId,
            userEmail,
          },
        });
      } else {
        console.log(`No existing customer found for email: ${userEmail}, will create new one`);
      }
    } catch (error) {
      console.error('Error checking for existing customer:', error);
    }

    if (type === 'subscription') {
      if (!tier || !SUBSCRIPTION_PRICES[tier]) {
        return new Response(JSON.stringify({ error: 'Valid subscription tier is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      priceId = SUBSCRIPTION_PRICES[tier];
      mode = 'subscription';
      successUrl = `${baseUrl}/?stripe_success=subscription&tier=${tier}`;
      cancelUrl = `${baseUrl}/?stripe_canceled=subscription`;
    } else if (type === 'topoff') {
      priceId = PEANUT_TOPOFF_PRICE;
      mode = 'payment';
      successUrl = `${baseUrl}/?stripe_success=topoff`;
      cancelUrl = `${baseUrl}/?stripe_canceled=topoff`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid checkout type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Use existing customer if found, otherwise let Stripe create a new one
      ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
      client_reference_id: userId,
      metadata: {
        userId,
        type,
        ...(tier && { tier }),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      automatic_tax: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
