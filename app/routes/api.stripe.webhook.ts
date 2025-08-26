import Stripe from 'stripe';
import { callNutAPI } from '~/lib/replay/NutAPI';

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

// Enhanced utility function to get userId from customer - Stripe as authoritative source
async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if (!customer || customer.deleted) {
      console.error('❌ Customer not found or deleted:', customerId);
      return null;
    }

    let userId = customer.metadata?.userId;

    // If no userId in metadata, try comprehensive search approaches
    if (!userId && customer.email) {
      console.log(`🔍 No userId in customer ${customerId} metadata, searching by email: ${customer.email}`);

      // Search for all customers with this email
      const customersWithEmail = await stripe.customers.list({
        email: customer.email,
        limit: 25, // Check more customers to be thorough
      });

      // Find a customer with userId metadata (prefer the most recent)
      const customerWithUserId = customersWithEmail.data
        .filter((c) => c.metadata?.userId)
        .sort((a, b) => b.created - a.created)[0]; // Most recent first

      if (customerWithUserId) {
        userId = customerWithUserId.metadata.userId;
        const userEmail = customerWithUserId.metadata.userEmail || customer.email;

        // Update current customer with complete metadata - making Stripe authoritative
        await stripe.customers.update(customerId, {
          metadata: {
            ...customer.metadata,
            userId,
            userEmail,
            lastUpdated: new Date().toISOString(),
            source: 'webhook-consolidation',
          },
        });

        console.log(
          `✅ Consolidated customer data: ${customerId} now has userId ${userId} from customer ${customerWithUserId.id}`,
        );
      } else {
        // Last resort: log detailed info for manual investigation
        console.error(`❌ Could not find userId for customer ${customerId} with email ${customer.email}`);
        console.error(
          `Available customers for email:`,
          customersWithEmail.data.map((c) => ({
            id: c.id,
            created: c.created,
            metadata: c.metadata,
          })),
        );
      }
    }

    if (userId) {
      console.log(`✅ Successfully retrieved userId: ${userId} for customer: ${customerId}`);
    }

    return userId || null;
  } catch (error) {
    console.error('❌ Error getting userId from customer:', error);
    return null;
  }
}

// Utility function to get peanuts from price ID
function getPeanutsFromPriceId(priceId: string): number {
  if (priceId === process.env.STRIPE_PRICE_FREE) {
    return SUBSCRIPTION_PEANUTS.free;
  }
  if (priceId === process.env.STRIPE_PRICE_STARTER) {
    return SUBSCRIPTION_PEANUTS.starter;
  }
  if (priceId === process.env.STRIPE_PRICE_BUILDER) {
    return SUBSCRIPTION_PEANUTS.builder;
  }
  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return SUBSCRIPTION_PEANUTS.pro;
  }
  return 0;
}

// Utility function to get tier from price ID
function getTierFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_FREE) {
    return 'free';
  }
  if (priceId === process.env.STRIPE_PRICE_STARTER) {
    return 'starter';
  }
  if (priceId === process.env.STRIPE_PRICE_BUILDER) {
    return 'builder';
  }
  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return 'pro';
  }
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
      // case 'customer.subscription.created': {
      //   const subscription = event.data.object as Stripe.Subscription;
      //   await handleSubscriptionCreated(subscription);
      //   break;
      // }

      // case 'customer.subscription.updated': {
      //   const subscription = event.data.object as Stripe.Subscription;
      //   await handleSubscriptionUpdated(subscription);
      //   break;
      // }

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
      // case 'checkout.session.completed': {
      //   const session = event.data.object as Stripe.Checkout.Session;
      //   await handleCheckoutCompleted(session);
      //   break;
      // }

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
// async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
//   try {
//     console.log('🆕 WEBHOOK: Processing subscription creation:', {
//       subscriptionId: subscription.id,
//       customerId: subscription.customer,
//       status: subscription.status,
//       priceId: subscription.items.data[0]?.price.id,
//       metadata: subscription.metadata,
//     });

//     const userId = await getUserIdFromCustomer(subscription.customer as string);
//     if (!userId) {
//       console.error('❌ No userId found for customer:', subscription.customer);
//       return;
//     }

//     const priceId = subscription.items.data[0]?.price.id;
//     if (!priceId) {
//       console.error('❌ No price ID found in subscription:', subscription.id);
//       return;
//     }

//     const peanuts = getPeanutsFromPriceId(priceId);
//     const tier = getTierFromPriceId(priceId);

//     console.log('🔍 Price mapping result:', { priceId, tier, peanuts });

//     if (peanuts === 0) {
//       console.error(`❌ Unknown price ID: ${priceId}`);
//       console.error('Available env vars:', {
//         free: process.env.STRIPE_PRICE_FREE,
//         starter: process.env.STRIPE_PRICE_STARTER,
//         builder: process.env.STRIPE_PRICE_BUILDER,
//         pro: process.env.STRIPE_PRICE_PRO,
//       });
//       return;
//     }

//     // Set initial subscription and peanuts
//     await callNutAPI(
//       'set-peanuts-subscription',
//       {
//         userId,
//         peanuts,
//       },
//       undefined, // no streaming callback
//       userId // use this userId instead of session-based lookup
//     );

//     console.log(`✅ WEBHOOK: Created ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
//   } catch (error) {
//     console.error('❌ Error handling subscription creation:', error);
//   }
// }

// Handler for subscription updates (tier changes)
// async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
//   try {
//     const userId = await getUserIdFromCustomer(subscription.customer as string);
//     if (!userId) return;

//     const priceId = subscription.items.data[0]?.price.id;
//     if (!priceId) {
//       console.error('No price ID found in subscription:', subscription.id);
//       return;
//     }

//     const peanuts = getPeanutsFromPriceId(priceId);
//     const tier = getTierFromPriceId(priceId);

//     if (peanuts === 0) {
//       console.error(`❌ Unknown price ID: ${priceId}`);
//       return;
//     }

//     // Update subscription tier and peanuts
//     await callNutAPI(
//       'set-peanuts-subscription',
//       {
//         userId,
//         peanuts,
//       },
//       undefined, // no streaming callback
//       userId // use this userId instead of session-based lookup
//     );

//     console.log(`✅ Updated to ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
//   } catch (error) {
//     console.error('Error handling subscription update:', error);
//   }
// }

// Handler for subscription cancellation
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) {
      return;
    }

    // Clear the subscription
    await callNutAPI(
      'set-peanuts-subscription',
      {
        userId,
        peanuts: undefined,
      },
      undefined, // no streaming callback
      userId, // use this userId instead of session-based lookup
    );

    console.log(`✅ Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Handler for subscription pausing (payment failures)
async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  try {
    const userId = await getUserIdFromCustomer(subscription.customer as string);
    if (!userId) {
      return;
    }

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
    if (!userId) {
      return;
    }

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
    await callNutAPI(
      'set-peanuts-subscription',
      {
        userId,
        peanuts,
      },
      undefined, // no streaming callback
      userId, // use this userId instead of session-based lookup
    );

    console.log(`✅ Resumed ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
  } catch (error) {
    console.error('Error handling subscription resume:', error);
  }
}

// Handler for successful payments (renewals and initial)
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const userId = await getUserIdFromCustomer(invoice.customer as string);
    if (!userId) {
      return;
    }

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
      await callNutAPI(
        'set-peanuts-subscription',
        {
          userId,
          peanuts,
        },
        undefined, // no streaming callback
        userId, // use this userId instead of session-based lookup
      );

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
    if (!userId) {
      return;
    }

    console.log(`❌ Payment failed for user ${userId}, invoice: ${invoice.id}`);

    // The subscription will be automatically paused by Stripe
    // We handle the actual pausing in handleSubscriptionPaused

    // You might want to send a notification email here
    // or set a flag to show payment failure UI
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handler for completed checkouts (peanut top-offs and subscriptions)
// async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
//   try {
//     const metadata = session.metadata;

//     console.log('🛒 Checkout completed:', {
//       sessionId: session.id,
//       mode: session.mode,
//       customerId: session.customer,
//       clientReferenceId: session.client_reference_id,
//       metadata: metadata,
//       subscription: session.subscription,
//       paymentStatus: session.payment_status,
//     });

//     // Get userId from metadata or client_reference_id
//     let userId = metadata?.userId || session.client_reference_id;

//     // If we have a customer, try to get userId from customer metadata
//     if (session.customer && !userId) {
//       userId = await getUserIdFromCustomer(session.customer as string);
//     }

//     if (!userId) {
//       console.error('❌ No userId found in checkout session');
//       return;
//     }

//     // CRITICAL: Update customer metadata with userId for future webhooks - Stripe as authoritative source
//     if (session.customer) {
//       try {
//         await stripe.customers.update(session.customer as string, {
//           metadata: {
//             userId,
//             userEmail: metadata?.userEmail || session.customer_email || '',
//             lastCheckoutSession: session.id,
//             lastUpdated: new Date().toISOString(),
//             source: 'checkout-completion'
//           },
//         });
//         console.log(`✅ Enhanced customer ${session.customer} metadata with complete user info - Stripe now authoritative`);
//       } catch (error) {
//         console.error('❌ Error updating customer metadata in checkout completion:', error);
//       }
//     }

//     // Handle peanut top-offs
//     if (metadata?.type === 'topoff') {
//       const topoffAmount = 2000; // Standard top-off amount

//       await callNutAPI(
//         'add-peanuts',
//         {
//           userId,
//           peanuts: topoffAmount,
//         },
//         undefined, // no streaming callback
//         userId // use this userId instead of session-based lookup
//       );

//       console.log(`✅ Added ${topoffAmount} peanuts via top-off for user ${userId}`);
//     }

//     // Handle subscription checkouts
//     else if (metadata?.type === 'subscription') {
//       console.log(`🔄 Processing subscription checkout for user ${userId}`);

//       // If subscription webhooks are working, this will be redundant but harmless
//       // If they're not, this ensures the subscription is processed
//       if (session.subscription) {
//         try {
//           const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
//           const priceId = subscription.items.data[0]?.price.id;
//           const peanuts = getPeanutsFromPriceId(priceId);
//           const tier = getTierFromPriceId(priceId);

//           if (peanuts > 0) {
//             await callNutAPI(
//               'set-peanuts-subscription',
//               {
//                 userId,
//                 peanuts,
//               },
//               undefined, // no streaming callback
//               userId // use this userId instead of session-based lookup
//             );
//             console.log(`✅ CHECKOUT: Created ${tier} subscription for user ${userId} with ${peanuts} peanuts`);
//           } else {
//             console.error(`❌ Unknown price ID in checkout subscription: ${priceId}`);
//           }
//         } catch (error) {
//           console.error('Error processing subscription via checkout:', error);
//         }
//       } else {
//         console.log('⚠️ Subscription checkout completed but no subscription ID found yet');
//       }
//     }
//   } catch (error) {
//     console.error('Error handling checkout completion:', error);
//   }
// }
