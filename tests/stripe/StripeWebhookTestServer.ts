import Stripe from 'stripe';
import express from 'express';
import type { Request, Response } from 'express';
import { action as webhookHandler } from '~/routes/api.stripe.webhook';

type WebhookEvent = {
  timestamp: number;
  event: Stripe.Event;
  response: any;
  error?: any;
};

type WebhookCallMap = {
  [key: string]: WebhookEvent[];
};

interface NutAPICall {
  method: string;
  request: any;
  response?: any;
  timestamp: number;
}

export class StripeWebhookTestServer {
  private app: express.Application;
  private server: any;
  private stripe: Stripe;
  private webhookCalls: WebhookCallMap = {};
  private nutAPICalls: NutAPICall[] = [];
  private port: number = 0;
  public testClockId: string | null = null;
  private webhookSecret: string;

  constructor(
    stripe: Stripe,
    webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
  ) {
    this.stripe = stripe;
    this.webhookSecret = webhookSecret;
    this.app = express();
    
    // Parse raw body for Stripe signature verification
    this.app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
    
    // Mount the webhook endpoint
    this.app.post('/api/stripe/webhook', this.handleWebhookRequest.bind(this));
  }

  private async handleWebhookRequest(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      // Create a proper Request object for the webhook handler
      const request = new Request(`http://localhost:${this.port}/api/stripe/webhook`, {
        method: 'POST',
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [key, String(value)])
        ),
        body: req.body,
      });

      // Call the actual webhook handler
      const response = await webhookHandler({ request });
      const responseData = await response.json();
      
      // Parse the event for tracking
      const event = this.stripe.webhooks.constructEvent(
        req.body.toString('utf8'),
        req.headers['stripe-signature'] as string,
        this.webhookSecret
      );
      
      // Store webhook call for testing assertions
      if (!this.webhookCalls[event.type]) {
        this.webhookCalls[event.type] = [];
      }
      
      this.webhookCalls[event.type].push({
        timestamp: startTime,
        event,
        response: responseData,
      });
      
      // Send the response
      res.status(response.status).json(responseData);
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      
      // Store error for debugging
      const errorEvent = {
        timestamp: startTime,
        event: { type: 'error' } as any,
        response: null,
        error: error.message,
      };
      
      if (!this.webhookCalls['error']) {
        this.webhookCalls['error'] = [];
      }
      this.webhookCalls['error'].push(errorEvent);
      
      res.status(400).json({ error: error.message });
    }
  }

  async start(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, async () => {
        this.port = this.server.address().port;
        console.log(`Stripe webhook test server listening on port ${this.port}`);
        
        // Create test clock if needed
        if (!this.testClockId) {
          try {
            await this.createTestClock();
          } catch (error) {
            console.error('Failed to create test clock:', error);
          }
        }
        
        resolve(this.port);
      });
      
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Stripe webhook test server stopped');
          resolve();
        });
      } else {
        resolve();
      }
      
      // Clean up test clock
      if (this.testClockId) {
        this.deleteTestClock().catch(console.error);
      }
    });
  }

  async createTestClock(): Promise<Stripe.TestHelpers.TestClock> {
    try {
      const testClock = await this.stripe.testHelpers.testClocks.create({
        frozen_time: Math.floor(Date.now() / 1000),
        name: `Test Clock - ${new Date().toISOString()}`,
      });
      
      this.testClockId = testClock.id;
      console.log(`Created test clock with ID: ${this.testClockId}`);
      return testClock;
    } catch (error) {
      console.error('Error creating test clock:', error);
      throw error;
    }
  }

  async deleteTestClock(): Promise<void> {
    if (!this.testClockId) return;
    
    try {
      await this.stripe.testHelpers.testClocks.del(this.testClockId);
      console.log(`Deleted test clock with ID: ${this.testClockId}`);
      this.testClockId = null;
    } catch (error) {
      console.error('Error deleting test clock:', error);
    }
  }

  async advanceTestClock(seconds: number): Promise<void> {
    if (!this.testClockId) {
      throw new Error('Test clock not initialized');
    }
    
    const maxAdvancement = 60 * 60 * 24 * 30; // 30 days
    let remaining = seconds;
    
    while (remaining > 0) {
      const chunk = Math.min(remaining, maxAdvancement);
      const clock = await this.stripe.testHelpers.testClocks.retrieve(this.testClockId);
      
      await this.stripe.testHelpers.testClocks.advance(this.testClockId, {
        frozen_time: clock.frozen_time + chunk,
      });
      
      remaining -= chunk;
      
      // Wait for clock advancement to process
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async waitForWebhook(
    eventType: string | string[],
    timeoutMs: number = 10000,
    checkIntervalMs: number = 100
  ): Promise<WebhookEvent> {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      for (const type of types) {
        const events = this.webhookCalls[type];
        if (events && events.length > 0) {
          // Return the most recent event
          return events[events.length - 1];
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
    
    throw new Error(
      `Timeout waiting for webhook event(s): ${types.join(', ')}. ` +
      `Received events: ${Object.keys(this.webhookCalls).join(', ')}`
    );
  }

  async waitForWebhooks(
    eventTypes: string[],
    timeoutMs: number = 10000
  ): Promise<{ [key: string]: WebhookEvent }> {
    const results: { [key: string]: WebhookEvent } = {};
    const deadline = Date.now() + timeoutMs;
    
    for (const type of eventTypes) {
      const remainingTime = Math.max(deadline - Date.now(), 0);
      if (remainingTime === 0) {
        throw new Error(`Timeout waiting for webhook: ${type}`);
      }
      
      const event = await this.waitForWebhook(type, remainingTime);
      results[type] = event;
    }
    
    return results;
  }

  clearWebhookCalls(): void {
    this.webhookCalls = {};
  }

  getWebhookCalls(eventType?: string): WebhookEvent[] {
    if (eventType) {
      return this.webhookCalls[eventType] || [];
    }
    
    return Object.values(this.webhookCalls).flat();
  }

  getAllWebhookCalls(): WebhookCallMap {
    return this.webhookCalls;
  }

  // Track NutAPI calls (you'll need to mock/spy on the actual NutAPI)
  trackNutAPICall(method: string, request: any, response: any): void {
    this.nutAPICalls.push({
      method,
      request,
      response,
      timestamp: Date.now(),
    });
  }

  getNutAPICalls(method?: string): NutAPICall[] {
    if (method) {
      return this.nutAPICalls.filter(call => call.method === method);
    }
    return this.nutAPICalls;
  }

  clearNutAPICalls(): void {
    this.nutAPICalls = [];
  }

  getWebhookUrl(): string {
    if (!this.port) {
      throw new Error('Server not started');
    }
    return `http://localhost:${this.port}/api/stripe/webhook`;
  }

  // Helper to create test resources with test clock
  async createTestCustomer(email: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      metadata,
      test_clock: this.testClockId || undefined,
    });
  }

  async createTestSubscription(
    customerId: string,
    priceId: string,
    options?: Partial<Stripe.SubscriptionCreateParams>
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      ...options,
      test_clock: this.testClockId || undefined,
    } as any);
  }

  async createTestPrice(
    amount: number,
    currency: string = 'usd',
    interval: 'month' | 'year' = 'month'
  ): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      unit_amount: amount,
      currency,
      recurring: { interval },
      product_data: {
        name: `Test Product ${Date.now()}`,
      },
    });
  }

  async createTestPaymentMethod(customerId?: string): Promise<Stripe.PaymentMethod> {
    const pm = await this.stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' },
    });
    
    if (customerId) {
      await this.stripe.paymentMethods.attach(pm.id, {
        customer: customerId,
      });
    }
    
    return pm;
  }
}