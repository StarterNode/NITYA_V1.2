/**
 * Playwright Configuration for E2E Testing
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 30000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker to avoid database conflicts

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared test configuration
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Slower actions for stability
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // }
  ],

  // Web server configuration
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  }
});
