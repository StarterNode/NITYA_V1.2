/**
 * E2E Test: New Session Flow
 * Tests the complete user experience for a first-time user
 *
 * NOTE: Requires Anthropic API key to be configured in config.js
 * These tests hit the real API and may incur costs.
 */

const { test, expect } = require('@playwright/test');

test.describe('New Session - First Time User', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/NITYA|Lead Design Consultant/i);

    // Verify main UI components are present
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeVisible();
    await expect(page.locator('.chat-panel')).toBeVisible();
    await expect(page.locator('.preview-section')).toBeVisible();
  });

  test('should display initial welcome state', async ({ page }) => {
    // Check for welcome message or empty chat state
    const messagesContainer = page.locator('#messages');
    await expect(messagesContainer).toBeVisible();

    // Verify no previous messages
    const messageCount = await page.locator('.message').count();
    expect(messageCount).toBe(0);
  });

  test('should have all UI components visible', async ({ page }) => {
    // Chat components
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeVisible();

    // Preview components
    await expect(page.locator('.preview-container')).toBeVisible();
    await expect(page.locator('.device-toggle-bar')).toBeVisible();

    // Device toggle buttons
    await expect(page.locator('button[data-device="desktop"]')).toBeVisible();
    await expect(page.locator('button[data-device="tablet"]')).toBeVisible();
    await expect(page.locator('button[data-device="mobile"]')).toBeVisible();

    // Resizable divider
    await expect(page.locator('.resize-divider')).toBeVisible();
  });

  test('should send first message and receive response', async ({ page }) => {
    // Type message
    await page.fill('#chat-input', 'Hello, NITYA! I need help building a website.');

    // Send message
    await page.click('#send-button');

    // Verify user message appears
    await page.waitForSelector('.user-message', { timeout: 2000 });
    const userMessage = await page.locator('.user-message').textContent();
    expect(userMessage).toContain('Hello, NITYA');

    // Wait for AI response (allow 15s for API)
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Verify AI response exists
    const aiMessages = await page.locator('.ai-message').count();
    expect(aiMessages).toBeGreaterThan(0);

    // Verify input is cleared and ready
    const inputValue = await page.locator('#chat-input').inputValue();
    expect(inputValue).toBe('');

    // Verify send button is enabled again
    await expect(page.locator('#send-button')).toBeEnabled();
  });

  test('should handle multi-turn conversation', async ({ page }) => {
    // First message
    await page.fill('#chat-input', 'I want to build a website for my bakery');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Second message
    await page.fill('#chat-input', 'My business is called Sweet Treats Bakery');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(2)', { timeout: 15000 });

    // Third message
    await page.fill('#chat-input', 'We specialize in custom cakes and pastries');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(3)', { timeout: 15000 });

    // Verify all messages are present
    const userMessages = await page.locator('.user-message').count();
    const aiMessages = await page.locator('.ai-message').count();

    expect(userMessages).toBe(3);
    expect(aiMessages).toBeGreaterThanOrEqual(3);
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Type message
    await page.fill('#chat-input', 'Test keyboard shortcut');

    // Press Enter to send (instead of clicking button)
    await page.press('#chat-input', 'Enter');

    // Verify message was sent
    await page.waitForSelector('.user-message', { timeout: 2000 });
    const userMessage = await page.locator('.user-message').textContent();
    expect(userMessage).toContain('Test keyboard shortcut');
  });

  test('should handle long messages', async ({ page }) => {
    const longMessage = 'This is a very long message. '.repeat(20);

    await page.fill('#chat-input', longMessage);
    await page.click('#send-button');

    await page.waitForSelector('.user-message', { timeout: 2000 });
    const userMessage = await page.locator('.user-message').textContent();
    expect(userMessage.length).toBeGreaterThan(100);
  });

  test('should display typing indicator while waiting', async ({ page }) => {
    await page.fill('#chat-input', 'Test typing indicator');
    await page.click('#send-button');

    // Typing indicator should appear while waiting
    const typingIndicator = page.locator('.typing-indicator');
    await expect(typingIndicator).toBeVisible({ timeout: 1000 });

    // Should disappear when response arrives
    await page.waitForSelector('.ai-message', { timeout: 15000 });
    await expect(typingIndicator).not.toBeVisible();
  });

  test('should scroll to latest message automatically', async ({ page }) => {
    // Send multiple messages to create scroll
    for (let i = 0; i < 5; i++) {
      await page.fill('#chat-input', `Message ${i + 1}`);
      await page.click('#send-button');
      await page.waitForSelector(`.user-message:nth-of-type(${i + 1})`, { timeout: 2000 });
    }

    // Verify messages container is scrolled to bottom
    const messagesContainer = page.locator('#messages');
    const scrollTop = await messagesContainer.evaluate(el => el.scrollTop);
    const scrollHeight = await messagesContainer.evaluate(el => el.scrollHeight);
    const clientHeight = await messagesContainer.evaluate(el => el.clientHeight);

    expect(scrollTop + clientHeight).toBeCloseTo(scrollHeight, 50);
  });

  test('should handle empty message gracefully', async ({ page }) => {
    // Try to send empty message
    await page.click('#send-button');

    // Should not create a message
    const messageCount = await page.locator('.message').count();
    expect(messageCount).toBe(0);
  });

  test('should disable send button while processing', async ({ page }) => {
    await page.fill('#chat-input', 'Test button state');
    await page.click('#send-button');

    // Button should be disabled immediately
    await expect(page.locator('#send-button')).toBeDisabled({ timeout: 500 });

    // Wait for response
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Button should be enabled again
    await expect(page.locator('#send-button')).toBeEnabled();
  });
});

test.describe('New Session - Device Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle between device views', async ({ page }) => {
    const previewFrame = page.locator('iframe#preview-frame');

    // Default should be desktop
    await expect(page.locator('button[data-device="desktop"]')).toHaveClass(/active/);

    // Switch to tablet
    await page.click('button[data-device="tablet"]');
    await expect(page.locator('button[data-device="tablet"]')).toHaveClass(/active/);

    // Switch to mobile
    await page.click('button[data-device="mobile"]');
    await expect(page.locator('button[data-device="mobile"]')).toHaveClass(/active/);

    // Switch back to desktop
    await page.click('button[data-device="desktop"]');
    await expect(page.locator('button[data-device="desktop"]')).toHaveClass(/active/);
  });

  test('should resize preview frame based on device', async ({ page }) => {
    const previewFrame = page.locator('iframe#preview-frame');

    // Desktop view
    await page.click('button[data-device="desktop"]');
    const desktopWidth = await previewFrame.evaluate(el => el.offsetWidth);

    // Tablet view
    await page.click('button[data-device="tablet"]');
    const tabletWidth = await previewFrame.evaluate(el => el.offsetWidth);

    // Mobile view
    await page.click('button[data-device="mobile"]');
    const mobileWidth = await previewFrame.evaluate(el => el.offsetWidth);

    // Widths should decrease: desktop > tablet > mobile
    expect(desktopWidth).toBeGreaterThan(tabletWidth);
    expect(tabletWidth).toBeGreaterThan(mobileWidth);
  });

  test('should persist device selection', async ({ page }) => {
    // Select tablet
    await page.click('button[data-device="tablet"]');
    await expect(page.locator('button[data-device="tablet"]')).toHaveClass(/active/);

    // Reload page
    await page.reload();

    // Should remember tablet selection
    await expect(page.locator('button[data-device="tablet"]')).toHaveClass(/active/);
  });
});

test.describe('New Session - Resizable Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow resizing the layout', async ({ page }) => {
    const divider = page.locator('.resize-divider');
    const chatPanel = page.locator('.chat-panel');

    // Get initial width
    const initialWidth = await chatPanel.evaluate(el => el.offsetWidth);

    // Drag divider to resize
    const dividerBox = await divider.boundingBox();
    await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dividerBox.x + 100, dividerBox.y + dividerBox.height / 2);
    await page.mouse.up();

    // Get new width
    const newWidth = await chatPanel.evaluate(el => el.offsetWidth);

    // Width should have changed
    expect(newWidth).not.toBe(initialWidth);
  });

  test('should persist layout size preference', async ({ page }) => {
    const divider = page.locator('.resize-divider');
    const chatPanel = page.locator('.chat-panel');

    // Resize
    const dividerBox = await divider.boundingBox();
    await page.mouse.move(dividerBox.x, dividerBox.y);
    await page.mouse.down();
    await page.mouse.move(dividerBox.x + 100, dividerBox.y);
    await page.mouse.up();

    const resizedWidth = await chatPanel.evaluate(el => el.offsetWidth);

    // Reload
    await page.reload();

    // Should remember size
    const widthAfterReload = await chatPanel.evaluate(el => el.offsetWidth);
    expect(widthAfterReload).toBeCloseTo(resizedWidth, 10);
  });
});

test.describe('New Session - Performance', () => {
  test('should meet initial load time target', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`  ⏱️ Initial load time: ${loadTime}ms`);

    // Target: < 1.5s
    expect(loadTime).toBeLessThan(1500);
  });

  test('should render UI components quickly', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();

    // Wait for all main components to be visible
    await Promise.all([
      page.locator('#chat-input').waitFor({ state: 'visible' }),
      page.locator('#send-button').waitFor({ state: 'visible' }),
      page.locator('.preview-section').waitFor({ state: 'visible' }),
      page.locator('.device-toggle-bar').waitFor({ state: 'visible' })
    ]);

    const renderTime = Date.now() - startTime;

    console.log(`  ⏱️ UI render time: ${renderTime}ms`);

    // Should render within 500ms
    expect(renderTime).toBeLessThan(500);
  });
});
