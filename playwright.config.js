// playwright.config.js
// Playwright Test configuration for Task Manager
// Covers stories: CC-119, CC-120

'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Directory where Playwright will look for spec files
  testDir: './tests/e2e',

  // Global timeout per test (30s)
  timeout: 30_000,

  // Repeat each test up to 1 time on failure
  retries: 1,

  // Run test files in parallel
  fullyParallel: true,

  use: {
    // Base URL for page.goto('/') calls
    baseURL: 'http://localhost:3000',

    headless: true,

    // Collect trace on first retry for easier debugging
    trace: 'on-first-retry',

    // Record screenshots on failure
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  // Output folder for test results and traces
  outputDir: './playwright-results',
});
