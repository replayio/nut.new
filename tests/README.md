# End-to-End Tests

This directory contains end-to-end tests using [Playwright](https://playwright.dev/).

## Running Tests

You can run the tests using the following commands:

```bash
# Run all tests
pnpm test:e2e

# Run tests in UI mode
pnpm test:e2e:ui

# Run only Chromium tests
pnpm test:e2e:chromium
```

## Test Structure

- `e2e/` - Contains all end-to-end tests
  - `setup/` - Test utilities and helper functions
  - `homepage.spec.ts` - Tests for the homepage
  - `chat.spec.ts` - Tests for the chat interface

## Adding New Tests

When adding new tests:

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Import the necessary utilities from `setup/test-utils.ts`
3. Use the `test.describe()` and `test()` functions to define test suites and cases

## Debugging Tests

You can debug tests by running them in UI mode:

```bash
pnpm test:e2e:ui
```

This will open the Playwright UI, where you can:
- See test results
- View screenshots and videos
- Trace test execution
- Re-run specific tests

## Test Data Attributes

For reliable selectors, we use data attributes in our components:

- `data-testid="chat-interface"` - The main chat interface
- `data-testid="message-input"` - The message input field
- `data-testid="send-button"` - The send message button
- `data-testid="assistant-message"` - Messages from the assistant
- `data-testid="model-selector"` - The model selection dropdown
- `data-testid="model-option"` - Individual model options in the dropdown

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root.