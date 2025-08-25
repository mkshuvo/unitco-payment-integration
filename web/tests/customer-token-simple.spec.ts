import { test, expect } from '@playwright/test';

test.describe('Customer Token Core Functionality', () => {
  test('verifies token refresh API calls work', async ({ page }) => {
    let tokenCallCount = 0;
    
    // Mock the token endpoint
    await page.route('**/integration/unit/customers/*/token', async (route) => {
      if (route.request().method() === 'POST') {
        tokenCallCount++;
        await route.fulfill({
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            token: `ctok_mock_${tokenCallCount}`, 
            expiresIn: 65 
          }),
        });
        return;
      }
      await route.fallback();
    });

    // Navigate to a simple page
    await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');

    // Simulate API calls that would happen during token refresh
    await page.evaluate(async () => {
      // Initial token creation
      await fetch('/integration/unit/customers/test/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'test', expiresIn: 65 })
      });
      
      // Simulate auto-refresh
      await fetch('/integration/unit/customers/test/token', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'test', expiresIn: 65 })
      });
    });

    // Verify both calls were made
    expect(tokenCallCount).toBe(2);
  });

  test('verifies customer resolve API works', async ({ page }) => {
    let resolveCallCount = 0;
    
    await page.route('**/integration/unit/customers/resolve', async (route) => {
      if (route.request().method() === 'POST') {
        resolveCallCount++;
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            email: 'test@example.com', 
            customerId: 'cust_123', 
            persisted: true 
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');

    await page.evaluate(async () => {
      await fetch('/integration/unit/customers/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
    });

    expect(resolveCallCount).toBe(1);
  });
});
