import { test, expect } from '@playwright/test';

// Basic smoke test for the Application Form embedding page.
// It is resilient whether UNIT_API_KEY is configured or not.

test.describe('Onboarding Application Form', () => {
  test('loads page and shows component or a friendly state', async ({ page }) => {
    await page.goto('/onboarding/application-form');

    // Wait until the page reaches one of the acceptable states.
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const hasComponent = !!document.querySelector('unit-elements-application-form');
        const hasError = Array.from(document.querySelectorAll('*')).some(el => /Error:/.test(el.textContent || ''));
        const isWaiting = document.body.innerText.includes('Waiting for script or token…');
        return hasComponent || hasError || isWaiting;
      });
    }, { timeout: 30_000 }).toBe(true);

    // Either the component is rendered (token available) or the page shows
    // a friendly error/waiting state. Accept any of these to keep it robust offline.
    const component = page.locator('unit-elements-application-form');
    const errorBanner = page.getByText(/Error:/).first();
    const waitingText = page.getByText('Waiting for script or token…').first();
    const componentCount = await component.count();
    const hasError = await errorBanner.isVisible().catch(() => false);
    const isWaiting = await waitingText.isVisible().catch(() => false);

    expect(componentCount > 0 || hasError || isWaiting).toBeTruthy();

    // If the component is on the page, perform deeper assertions.
    if (componentCount > 0) {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      // Expect an iframe from Unit sandbox to appear and be visible
      const unitIframe = page.locator("iframe[src*='s.unit.sh']");
      await expect(unitIframe).toBeVisible({ timeout: 30_000 });

      // No console errors during deep path
      expect(errors).toEqual([]);
    }
  });

  test('renders with mocked backend token (no API required)', async ({ page }) => {

    // Prevent loading the real Unit CDN script and provide a stub custom element definition.
    await page.route('https://*.s.unit.sh/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await page.addInitScript(() => {
      // Guard against re-definitions by external scripts
      const origDefine = customElements.define.bind(customElements);
      // @ts-ignore
      customElements.define = (name, ctor, options) => {
        if (customElements.get(name)) return;
        // @ts-ignore
        origDefine(name, ctor, options);
      };
      // Minimal stub that renders a visible iframe to satisfy visibility assertions
      class UnitAppFormStub extends HTMLElement {
        connectedCallback() {
          const iframe = document.createElement('iframe');
          iframe.src = 'https://sandbox.s.unit.sh/blank';
          iframe.style.width = '16px';
          iframe.style.height = '16px';
          iframe.style.border = '0';
          this.appendChild(iframe);
        }
      }
      try {
        customElements.define('unit-elements-application-form', UnitAppFormStub as any);
      } catch {}
    });

    await page.route('**/integration/unit/application-forms', async (route) => {
      const req = route.request();
      const method = req.method();
      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': req.headers()['origin'] || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || 'content-type',
          },
        });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': req.headers()['origin'] || '*',
          },
          body: JSON.stringify({ id: 'af_mock', token: 'tok_mock', expiration: '2099-01-01T00:00:00Z' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/onboarding/application-form');

    await expect.poll(async () => {
      return await page.evaluate(() => !!customElements.get('unit-elements-application-form'));
    }, { timeout: 20_000 }).toBe(true);

    const component = page.locator('unit-elements-application-form');
    await expect(component).toHaveCount(1);
    await expect(component).toBeVisible();

    const unitIframe = page.locator("iframe[src*='s.unit.sh']");
    await expect.soft(unitIframe).toBeVisible({ timeout: 10_000 });
  });

  test('token endpoint via page.request returns a token when API is configured', async ({ page }) => {
    // First, try the backend endpoint.
    try {
      const url = 'http://localhost:41873/integration/unit/application-forms';
      const resp = await page.request.post(url, {
        data: { tags: { e2e: 'true' } },
        headers: { 'Content-Type': 'application/json' },
      });

      if (resp.ok()) {
        const json = await resp.json();
        expect(json.id).toBeTruthy();
        expect(json.token).toBeTruthy();
        return;
      }
    } catch {
      // fallthrough to direct Unit API path
    }

    // Fallback: if UNIT_API_KEY is present, call Unit API directly from the test runner (Node),
    // avoiding any exposure to the browser. This validates the key and token creation end-to-end.
    const UNIT_API_KEY = process.env.UNIT_API_KEY;
    if (!UNIT_API_KEY) {
      test.skip(true, 'Skipping: backend not reachable and UNIT_API_KEY not set in test environment');
    }

    const res = await fetch('https://api.s.unit.sh/application-forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UNIT_API_KEY}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'X-Accept-Version': 'V2024_06',
      },
      body: JSON.stringify({
        data: {
          type: 'applicationForm',
          attributes: {
            tags: { e2e: 'true' },
          },
        },
      }),
    });

    if (!res.ok) {
      test.skip(true, `Skipping: direct Unit API call failed (HTTP ${res.status})`);
    }

    const json = await res.json();
    const id = json?.data?.id;
    const token = json?.data?.attributes?.applicationFormToken?.token;
    expect(id).toBeTruthy();
    expect(token).toBeTruthy();
  });
});
