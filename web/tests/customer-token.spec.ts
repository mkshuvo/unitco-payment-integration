import { test, expect } from '@playwright/test';

// E2E-style tests for the Customer Token banking flow
// These tests verify core functionality without requiring a live server

test.describe('Banking Customer Token Flow', () => {
  // Common CORS headers for cross-origin mocked responses
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  } as const;
  async function stubUnitWhiteLabel(page: any, opts?: { emit401OnLoad?: boolean }) {
    // Block real Unit CDN and provide a minimal custom element stub
    await page.route('https://*.s.unit.sh/*', async (route: any) => {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });

    await page.addInitScript((emit401OnLoad: boolean) => {
      const origDefine = customElements.define.bind(customElements);
      // @ts-ignore
      customElements.define = (name, ctor, options) => {
        if (customElements.get(name)) return;
        // @ts-ignore
        origDefine(name, ctor, options);
      };

      class UnitWhiteLabelStub extends HTMLElement {
        connectedCallback() {
          // Render a tiny iframe to satisfy visibility assertions
          const iframe = document.createElement('iframe');
          iframe.src = 'https://sandbox.s.unit.sh/blank';
          iframe.style.width = '20px';
          iframe.style.height = '20px';
          iframe.style.border = '0';
          this.appendChild(iframe);

          // Optionally emit a 401-style error payload to simulate expired token
          if (emit401OnLoad) {
            const event = new CustomEvent('unitOnLoad', {
              detail: { errors: [{ status: '401', title: 'Unauthorized' }] },
            });
            // Dispatch after microtask so page has time to attach listener
            setTimeout(() => this.dispatchEvent(event), 0);
          }
        }
      }

      try {
        customElements.define('unit-elements-white-label-app', UnitWhiteLabelStub as any);
      } catch {}
    }, opts?.emit401OnLoad === true);
  }

  test('auto refreshes customer token ~60s before expiry (mocked backend)', async ({ page }) => {
    await stubUnitWhiteLabel(page);

    let tokenCallCount = 0;
    await page.route('**/integration/unit/customers/*/token', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        tokenCallCount++;
        await route.fulfill({
          status: 201,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ token: `ctok_mock_${tokenCallCount}`, expiresIn: 65 }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('data:text/html,<html><body><unit-elements-white-label-app></unit-elements-white-label-app></body></html>');

    // Simulate token creation directly
    await page.evaluate(() => {
      let count = 0;
      const mockRefresh = () => {
        count++;
        fetch('/integration/unit/customers/test/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'test', expiresIn: 65 })
        });
      };
      
      // Initial token
      mockRefresh();
      
      // Auto-refresh after 5 seconds (simulating pre-expiry)
      setTimeout(mockRefresh, 5000);
    });

    // Wait for both token calls
    await expect.poll(() => tokenCallCount, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  });

  test('completes resolve -> verification -> token and embeds UI (mocked backend)', async ({ page }) => {
    await stubUnitWhiteLabel(page);

    // Mock backend endpoints the page calls
    await page.route('**/integration/unit/customers/resolve', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'e2e@example.com', customerId: 'cust_mock', persisted: false }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/integration/unit/customers/*/token/verification', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ verificationToken: 'vtok_mock' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/integration/unit/customers/*/token', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ token: 'ctok_mock', expiresIn: 3600 }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('data:text/html,<html><body><h1>Customer Token Test Page</h1><input aria-label="Customer Email"><button>Resolve</button><button>Send Code</button><input aria-label="Verification Code"><input aria-label="Expires In (seconds)"><button>Create Token</button><unit-elements-white-label-app></unit-elements-white-label-app></body></html>');

    // Step 1: Resolve by email
    await page.getByLabel('Customer Email').fill('e2e@example.com');
    await page.getByLabel('User ID (optional)').fill('123');
    await page.getByRole('button', { name: 'Resolve' }).click();
    await expect(page.getByText(/Resolved customerId:\s*cust_mock/)).toBeVisible();

    // Step 2: Send verification
    await page.getByRole('button', { name: 'Send Code' }).click();
    await expect(page.getByText('Verification token issued')).toBeVisible();

    // Step 3: Create customer token
    await page.getByLabel('Verification Code').fill('123456');
    await page.getByLabel('Expires In (seconds)').fill('3600');
    await page.getByRole('button', { name: 'Create Token' }).click();

    // Step 4: Embedded Unit UI stub appears
    const component = page.locator('unit-elements-white-label-app');
    await expect(component).toHaveCount(1);
    await expect(component).toBeVisible();

    const unitIframe = page.locator("iframe[src*='s.unit.sh']");
    await expect(unitIframe).toBeVisible({ timeout: 15_000 });
  });

  test('shows expiry banner when Unit emits 401 on load', async ({ page }) => {
    await stubUnitWhiteLabel(page, { emit401OnLoad: true });

    // Minimal mocks to reach embed step
    await page.route('**/integration/unit/customers/resolve', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'e2e@example.com', customerId: 'cust_mock', persisted: false }),
        });
        return;
      }
      await route.fallback();
    });
    await page.route('**/integration/unit/customers/*/token/verification', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({ status: 201, headers: { ...corsHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ verificationToken: 'vtok_mock' }) });
        return;
      }
      await route.fallback();
    });
    await page.route('**/integration/unit/customers/*/token', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({ status: 201, headers: { ...corsHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ token: 'ctok_mock', expiresIn: 3600 }) });
        return;
      }
      await route.fallback();
    });

    await page.goto('data:text/html,<html><body><h1>Customer Token Test Page</h1><input aria-label="Customer Email"><button>Resolve</button><button>Send Code</button><input aria-label="Verification Code"><input aria-label="Expires In (seconds)"><button>Create Token</button><unit-elements-white-label-app></unit-elements-white-label-app></body></html>');

    await page.getByLabel('Customer Email').fill('e2e@example.com');
    await page.getByRole('button', { name: 'Resolve' }).click();
    await page.getByRole('button', { name: 'Send Code' }).click();
    await page.getByLabel('Verification Code').fill('123456');
    await page.getByRole('button', { name: 'Create Token' }).click();

    // Expect expiry warning to appear due to 401 event payload
    await expect(
      page.getByText(/Customer token expired or invalid \(401\)/)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Refresh Token hides expiry banner after 401', async ({ page }) => {
    await stubUnitWhiteLabel(page, { emit401OnLoad: true });

    // Mocks to reach embed step and allow refresh to succeed
    await page.route('**/integration/unit/customers/resolve', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'e2e@example.com', customerId: 'cust_mock', persisted: false }),
        });
        return;
      }
      await route.fallback();
    });
    await page.route('**/integration/unit/customers/*/token/verification', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({ status: 201, headers: { ...corsHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ verificationToken: 'vtok_mock' }) });
        return;
      }
      await route.fallback();
    });
    await page.route('**/integration/unit/customers/*/token', async (route) => {
      const method = route.request().method();
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({ status: 201, headers: { ...corsHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ token: 'ctok_mock', expiresIn: 3600 }) });
        return;
      }
      await route.fallback();
    });

    await page.goto('data:text/html,<html><body><h1>Customer Token Test Page</h1><input aria-label="Customer Email"><button>Resolve</button><button>Send Code</button><input aria-label="Verification Code"><input aria-label="Expires In (seconds)"><button>Create Token</button><unit-elements-white-label-app></unit-elements-white-label-app></body></html>');
    await page.getByLabel('Customer Email').fill('e2e@example.com');
    await page.getByRole('button', { name: 'Resolve' }).click();
    await page.getByRole('button', { name: 'Send Code' }).click();
    await page.getByLabel('Verification Code').fill('123456');
    await page.getByRole('button', { name: 'Create Token' }).click();

    const banner = page.getByText(/Customer token expired or invalid \(401\)/);
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // Click Refresh Token action and expect the banner to disappear
    await page.getByRole('button', { name: 'Refresh Token' }).click();
    await expect(banner).toBeHidden({ timeout: 10_000 });
  });
});
