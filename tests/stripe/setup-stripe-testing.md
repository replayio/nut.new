# Stripe Webhook Testing Setup Guide

This guide explains how to set up real integration testing for your Stripe webhooks.

## Overview

The new testing approach:
- ✅ Creates real Stripe test resources (customers, subscriptions, etc.)
- ✅ Triggers actual webhook events through Stripe API operations
- ✅ Tests your real webhook handler code
- ✅ Uses Stripe test clocks for time-based testing
- ✅ Tracks webhook calls and NutAPI calls for assertions

## Setup Options

### Option 1: Local Testing with Stripe CLI (Recommended for Development)

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Set Environment Variables**:
   ```bash
   export STRIPE_TEST_SECRET_KEY="sk_test_..."
   export STRIPE_TEST_WEBHOOK_SECRET="whsec_test_..."
   ```

4. **Run Tests**:
   ```bash
   # The test will automatically start stripe listen
   pnpm test tests/stripe/webhook-integration.test.ts
   ```

### Option 2: Webhook Endpoint Configuration (CI/CD)

1. **Set up a test webhook endpoint in Stripe Dashboard**:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Create endpoint pointing to your test server
   - Select events you want to test

2. **Get webhook secret**:
   ```bash
   export STRIPE_TEST_WEBHOOK_SECRET="whsec_..."
   ```

3. **Run tests**:
   ```bash
   pnpm test tests/stripe/webhook-integration.test.ts
   ```

## Test Structure

### Real Integration Tests

```typescript
it('should handle subscription cancellation', async () => {
  // 1. Create real Stripe resources
  const customer = await testServer.createTestCustomer('test@example.com', { userId: 'user_123' });
  const subscription = await testServer.createTestSubscription(customer.id, priceId);

  // 2. Perform real Stripe API operation that triggers webhook
  await stripe.subscriptions.cancel(subscription.id);

  // 3. Wait for webhook to be received and processed
  const cancelEvent = await testServer.waitForWebhook('customer.subscription.deleted');

  // 4. Assert webhook was processed correctly
  expect(cancelEvent.response).toEqual({ received: true });
  
  // 5. Assert your business logic was executed
  const nutAPICalls = testServer.getNutAPICalls('set-peanuts-subscription');
  expect(nutAPICalls).toHaveLength(1);
  expect(nutAPICalls[0].request).toEqual({
    userId: 'user_123',
    peanuts: undefined,
  });
});
```

### Key Testing Patterns

1. **Time-based testing with test clocks**:
   ```typescript
   // Advance test clock to trigger subscription renewal
   await testServer.advanceTestClock(31 * 24 * 60 * 60); // 31 days
   
   const renewalEvent = await testServer.waitForWebhook('invoice.payment_succeeded');
   ```

2. **Error scenario testing**:
   ```typescript
   // Use test cards that will be declined
   const paymentMethod = await stripe.paymentMethods.create({
     type: 'card',
     card: { token: 'tok_chargeDeclined' },
   });
   ```

3. **Multiple event waiting**:
   ```typescript
   const events = await testServer.waitForWebhooks([
     'customer.subscription.created',
     'invoice.payment_succeeded'
   ]);
   ```

## Environment Variables

```bash
# Required
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Optional - for specific price testing
TEST_MONTHLY_PRICE_ID=price_...
TEST_YEARLY_PRICE_ID=price_...
```

## Benefits of This Approach

1. **Real Integration Testing**: Tests actual Stripe webhook delivery and your handler
2. **Time Control**: Use test clocks to simulate billing cycles and time-based events  
3. **Comprehensive Coverage**: Test happy paths, error scenarios, and edge cases
4. **CI/CD Ready**: Can run in automated environments without external dependencies
5. **Debugging**: Clear visibility into webhook calls and business logic execution

## Test Resources

The test server automatically creates and cleans up:
- Test clocks for time-based testing
- Test customers with proper metadata
- Test subscriptions linked to test clocks
- Test payment methods (both working and failing)
- Test prices for different scenarios

## Running the Tests

```bash
# Run all webhook tests
pnpm test tests/stripe/webhook-integration.test.ts

# Run with debug output
DEBUG=stripe* pnpm test tests/stripe/webhook-integration.test.ts

# Run specific test
pnpm test tests/stripe/webhook-integration.test.ts -t "subscription cancellation"
```

## Debugging

1. **Check webhook calls**:
   ```typescript
   const allCalls = testServer.getAllWebhookCalls();
   console.log('Received webhooks:', Object.keys(allCalls));
   ```

2. **Check NutAPI calls**:
   ```typescript
   const nutCalls = testServer.getNutAPICalls();
   console.log('NutAPI calls:', nutCalls);
   ```

3. **Webhook URL**:
   ```typescript
   console.log('Webhook URL:', testServer.getWebhookUrl());
   ```

## Limitations

- Requires Stripe test mode API keys
- Some advanced Stripe features may need additional setup
- Test clocks have rate limits (handled automatically)
- Network timeouts may need adjustment for slow environments