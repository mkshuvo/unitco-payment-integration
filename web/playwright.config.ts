import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import dotenv from 'dotenv';

// Load env from repo root so UNIT_API_KEY is available to tests
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

export default defineConfig({
  testDir: './tests',
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer disabled - tests will run without live server
  // webServer: {
  //   command: 'next dev -p 8080',
  //   url: 'http://localhost:8080',
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },
});
