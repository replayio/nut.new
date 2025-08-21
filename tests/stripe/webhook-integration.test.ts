import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';
import { StripeWebhookTestServer } from './StripeWebhookTestServer';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// Mock NutAPI to track calls
vi.mock('~/lib/replay/NutAPI', () => {
  const actualModule = vi.importActual('~/lib/replay/NutAPI');
  return {
    ...actualModule,
    callNutAPI: vi.fn(async (method: string, request: any) => {
      // Track the call for assertions
      testServer?.trackNutAPICall(method, request, { success: true });
      return { success: true };
    }),
  };
});

// Mock Supabase client
vi.mock('~/lib/supabase/client', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('test-user-id'),
  getCurrentAccessToken: vi.fn().mockResolvedValue('test-access-token'),
}));

let testServer: StripeWebhookTestServer;
let stripe: Stripe;
let stripeListener: any;

const STRIPE_TEST_KEY = process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_...';
const STRIPE_TEST_WEBHOOK_SECRET = process.env.STRIPE_TEST_WEBHOOK_SECRET || 'whsec_test_...';

// Test price IDs - you'll need to create these in your Stripe test dashboard
// or create them dynamically in the tests
const TEST_PRICE_IDS = {
  monthly: process.env.TEST_MONTHLY_PRICE_ID || 'price_test_monthly',
  yearly: process.env.TEST_YEARLY_PRICE_ID || 'price_test_yearly',
};

describe('Stripe Webhook Integration Tests', () => {
  let serverPort: number;
  let testPriceId: string;

  beforeAll(async () => {
    // Initialize Stripe
    stripe = new Stripe(STRIPE_TEST_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    // Initialize and start test server
    testServer = new StripeWebhookTestServer(stripe, STRIPE_TEST_WEBHOOK_SECRET);
    serverPort = await testServer.start();
    
    // Create a test price for subscriptions
    const testPrice = await testServer.createTestPrice(999, 'usd', 'month');
    testPriceId = testPrice.id;

    // Option 1: Use stripe listen for local testing (requires Stripe CLI)
    // Uncomment this if you want to use real webhook forwarding
    /*
    stripeListener = spawn('stripe', [
      'listen',
      '--api-key', STRIPE_TEST_KEY,
      '--forward-to', `http://localhost:${serverPort}/api/stripe/webhook`,
    ]);
    
    // Wait for stripe listen to be ready
    await new Promise((resolve) => {
      stripeListener.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('Ready!')) {
          resolve(true);
        }
      });
    });
    */

    // Option 2: Configure webhook endpoint in Stripe test mode
    // This requires setting up a webhook endpoint in your Stripe dashboard
    // pointing to your test server URL
  }, 30000);

  afterAll(async () => {
    // Stop stripe listener if running
    if (stripeListener) {
      stripeListener.kill();
    }
    
    // Stop test server
    await testServer.stop();
  });

  beforeEach(() => {
    // Clear webhook and API call tracking
    testServer.clearWebhookCalls();
    testServer.clearNutAPICalls();
  });

  describe('Subscription Lifecycle - Real Events', () => {
    it('should handle subscription creation and cancellation', async () => {
      // Create a real customer
      const customer = await testServer.createTestCustomer(
        'test@example.com',
        { userId: 'user_123' }
      );

      // Create a payment method and attach it
      const paymentMethod = await testServer.createTestPaymentMethod(customer.id);
      
      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      // Create a real subscription - this will trigger webhooks
      const subscription = await testServer.createTestSubscription(
        customer.id,
        testPriceId,
        {
          default_payment_method: paymentMethod.id,
          metadata: { workspaceId: 'workspace_123' },
        }
      );

      // Wait for subscription creation webhooks
      const creationEvents = await testServer.waitForWebhooks([
        'customer.subscription.created',
        'invoice.created',
        'invoice.finalized',
        'invoice.payment_succeeded',
        'invoice.paid',
        'customer.subscription.updated',
      ], 15000);

      // Verify subscription was created
      expect(creationEvents['customer.subscription.created']).toBeDefined();
      expect(creationEvents['invoice.payment_succeeded']).toBeDefined();

      // Now cancel the subscription - this triggers real webhooks
      await stripe.subscriptions.cancel(subscription.id);

      // Wait for cancellation webhook
      const cancelEvent = await testServer.waitForWebhook(
        'customer.subscription.deleted',
        10000
      );

      // Verify the webhook was processed correctly
      expect(cancelEvent.response).toEqual({ received: true });
      
      // Verify NutAPI was called
      const nutAPICalls = testServer.getNutAPICalls('set-peanuts-subscription');
      expect(nutAPICalls).toHaveLength(1);
      expect(nutAPICalls[0].request).toEqual({
        userId: 'user_123',
        peanuts: undefined,
      });
    }, 30000);

    it('should handle subscription pause', async () => {
      const customer = await testServer.createTestCustomer(
        'pause@example.com',
        { userId: 'user_456' }
      );

      const paymentMethod = await testServer.createTestPaymentMethod(customer.id);
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      const subscription = await testServer.createTestSubscription(
        customer.id,
        testPriceId,
        {
          default_payment_method: paymentMethod.id,
        }
      );

      // Wait for creation to complete
      await testServer.waitForWebhook('customer.subscription.created', 10000);

      // Pause the subscription
      await stripe.subscriptions.update(subscription.id, {
        pause_collection: {
          behavior: 'void',
        },
      });

      // Wait for pause webhook
      const pauseEvent = await testServer.waitForWebhook(
        ['customer.subscription.paused', 'customer.subscription.updated'],
        10000
      );

      // For paused subscriptions, we should clear the peanuts
      const nutAPICalls = testServer.getNutAPICalls('set-peanuts-subscription');
      if (pauseEvent.event.type === 'customer.subscription.paused') {
        expect(nutAPICalls).toHaveLength(1);
        expect(nutAPICalls[0].request.peanuts).toBeUndefined();
      }
    }, 30000);

    it('should handle subscription renewal with test clock', async () => {
      if (!testServer.testClockId) {
        console.log('Skipping test clock test - clock not initialized');
        return;
      }

      const customer = await testServer.createTestCustomer(
        'renewal@example.com',
        { userId: 'user_789' }
      );

      const paymentMethod = await testServer.createTestPaymentMethod(customer.id);
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      const subscription = await testServer.createTestSubscription(
        customer.id,
        testPriceId,
        {
          default_payment_method: paymentMethod.id,
        }
      );

      // Wait for initial creation
      await testServer.waitForWebhook('customer.subscription.created', 10000);

      // Advance test clock by 31 days to trigger renewal
      await testServer.advanceTestClock(31 * 24 * 60 * 60);

      // Wait for renewal webhook
      const renewalEvent = await testServer.waitForWebhook(
        'invoice.payment_succeeded',
        30000
      );

      // Verify it's a renewal, not initial payment
      const invoice = renewalEvent.event.data.object as Stripe.Invoice;
      expect(invoice.billing_reason).toBe('subscription_cycle');
      expect(invoice.subscription).toBe(subscription.id);

      // Renewal should just log, not call NutAPI
      const nutAPICalls = testServer.getNutAPICalls();
      expect(nutAPICalls).toHaveLength(0);
    }, 60000);
  });

  describe('Invoice Payment Events - Real', () => {
    it('should distinguish between initial and renewal payments', async () => {
      const customer = await testServer.createTestCustomer(
        'invoice@example.com',
        { userId: 'user_invoice' }
      );

      const paymentMethod = await testServer.createTestPaymentMethod(customer.id);
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      // Clear any previous calls
      testServer.clearWebhookCalls();

      const subscription = await testServer.createTestSubscription(
        customer.id,
        testPriceId,
        {
          default_payment_method: paymentMethod.id,
        }
      );

      // Wait for initial payment
      const initialPayment = await testServer.waitForWebhook(
        'invoice.payment_succeeded',
        10000
      );

      const initialInvoice = initialPayment.event.data.object as Stripe.Invoice;
      
      // Initial payment should have billing_reason as 'subscription_create'
      expect(initialInvoice.billing_reason).toBe('subscription_create');
      
      // Your webhook handler should ignore initial payments
      // so no NutAPI calls should be made
      const nutAPICalls = testServer.getNutAPICalls();
      expect(nutAPICalls).toHaveLength(0);
    }, 30000);

    it('should handle failed payments', async () => {
      const customer = await testServer.createTestCustomer(
        'failed@example.com',
        { userId: 'user_failed' }
      );

      // Use a card that will be declined
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_chargeDeclined' },
      });

      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      // Try to create subscription with failing card
      try {
        await testServer.createTestSubscription(
          customer.id,
          testPriceId,
          {
            default_payment_method: paymentMethod.id,
          }
        );
      } catch (error: any) {
        // Expected to fail
        expect(error.type).toBe('StripeCardError');
      }

      // Wait for payment failed webhook
      const failedEvent = await testServer.waitForWebhook(
        'invoice.payment_failed',
        10000
      );

      expect(failedEvent).toBeDefined();
      expect(failedEvent.response).toEqual({ received: true });
    }, 30000);
  });

  describe('Customer Metadata Handling', () => {
    it('should handle missing userId in metadata', async () => {
      // Create customer without userId
      const customer = await testServer.createTestCustomer(
        'no-metadata@example.com',
        {} // No metadata
      );

      const paymentMethod = await testServer.createTestPaymentMethod(customer.id);
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      const subscription = await testServer.createTestSubscription(
        customer.id,
        testPriceId,
        {
          default_payment_method: paymentMethod.id,
        }
      );

      // Wait for creation
      await testServer.waitForWebhook('customer.subscription.created', 10000);

      // Cancel subscription
      await stripe.subscriptions.cancel(subscription.id);

      // Wait for cancellation
      const cancelEvent = await testServer.waitForWebhook(
        'customer.subscription.deleted',
        10000
      );

      // Should process successfully but not call NutAPI
      expect(cancelEvent.response).toEqual({ received: true });
      
      const nutAPICalls = testServer.getNutAPICalls('set-peanuts-subscription');
      expect(nutAPICalls).toHaveLength(0);
    }, 30000);
  });

  describe('Webhook Endpoint Configuration', () => {
    it('should provide correct webhook URL for Stripe configuration', () => {
      const webhookUrl = testServer.getWebhookUrl();
      expect(webhookUrl).toMatch(/^http:\/\/localhost:\d+\/api\/stripe\/webhook$/);
      
      console.log('Webhook URL for Stripe configuration:', webhookUrl);
      console.log('Use this URL in Stripe Dashboard or with stripe listen command');
    });

    it('should handle direct webhook POST requests', async () => {
      // Create a test event
      const event: Stripe.Event = {
        id: 'evt_test_direct',
        object: 'event',
        api_version: '2025-07-30.basil',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'sub_test',
            object: 'subscription',
            customer: 'cus_test',
            status: 'active',
          } as any,
          previous_attributes: {},
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.created',
      };

      // Generate signature
      const payload = JSON.stringify(event);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: STRIPE_TEST_WEBHOOK_SECRET,
      });

      // Send direct POST request
      const response = await fetch(testServer.getWebhookUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual({ received: true });
      
      // Verify webhook was tracked
      const calls = testServer.getWebhookCalls('customer.subscription.created');
      expect(calls).toHaveLength(1);
    }, 10000);
  });
});