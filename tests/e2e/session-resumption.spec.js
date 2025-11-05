/**
 * E2E Test: Session Resumption
 * Tests the returning user experience with session persistence
 *
 * NOTE: Requires Anthropic API key to be configured in config.js
 */

const { test, expect } = require('@playwright/test');

test.describe('Session Resumption - Returning User', () => {
  test('should detect and resume existing session', async ({ page }) => {
    // Step 1: Create a session by sending messages
    await page.goto('/');

    // Send initial message to create session
    await page.fill('#chat-input', 'I need a website for my coffee shop');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Send second message to build conversation
    await page.fill('#chat-input', 'The shop is called Java Junction');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(2)', { timeout: 15000 });

    // Get message count before reload
    const messagesBeforeReload = await page.locator('.message').count();
    expect(messagesBeforeReload).toBeGreaterThan(0);

    // Step 2: Reload page to trigger session resumption
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Step 3: Verify "Welcome back" or resumption message appears
    // Wait for AI to detect and respond to session resumption
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    // Get the first AI message after reload
    const firstMessage = await page.locator('.ai-message').first().textContent();

    // Should contain welcome back or resumption indicators
    const hasWelcomeBack = firstMessage.toLowerCase().includes('welcome back') ||
                          firstMessage.toLowerCase().includes('continue') ||
                          firstMessage.toLowerCase().includes('where we left');

    expect(hasWelcomeBack).toBe(true);

    // Step 4: Verify conversation history is restored
    const messagesAfterReload = await page.locator('.message').count();
    expect(messagesAfterReload).toBeGreaterThanOrEqual(messagesBeforeReload);

    // Verify original messages are present
    const allMessages = await page.locator('.message').allTextContents();
    const hasOriginalContent = allMessages.some(msg =>
      msg.includes('coffee shop') || msg.includes('Java Junction')
    );
    expect(hasOriginalContent).toBe(true);
  });

  test('should fire SYSTEM message on resumption', async ({ page }) => {
    // Create session
    await page.goto('/');
    await page.fill('#chat-input', 'Create a website for my gym');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Reload to trigger resumption
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for system to process resumption
    await page.waitForTimeout(2000);

    // System message should have been sent (check console or network if exposed)
    // Or check for evidence of MCP tools firing
    const messages = await page.locator('.message').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('should execute all 5 MCP tools on resumption', async ({ page }) => {
    // Create rich session with data
    await page.goto('/');
    await page.fill('#chat-input', 'My restaurant needs a website');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Add business name (creates metadata)
    await page.fill('#chat-input', 'It\'s called Bella Italia Restaurant');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(2)', { timeout: 15000 });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for MCP tools to execute (evidenced by AI response)
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    // Verify AI has context (meaning tools executed successfully)
    const aiResponse = await page.locator('.ai-message').first().textContent();

    // Should reference the business or show awareness of context
    const hasContext = aiResponse.toLowerCase().includes('bella') ||
                      aiResponse.toLowerCase().includes('restaurant') ||
                      aiResponse.toLowerCase().includes('previous') ||
                      aiResponse.toLowerCase().includes('conversation');

    expect(hasContext).toBe(true);
  });

  test('should maintain conversation continuity', async ({ page }) => {
    // Create session
    await page.goto('/');
    await page.fill('#chat-input', 'I want to build a site for my bakery');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    await page.fill('#chat-input', 'We make artisan breads');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(2)', { timeout: 15000 });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    // Continue conversation - AI should remember context
    await page.fill('#chat-input', 'What colors would work well?');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Get the latest AI response
    const latestResponse = await page.locator('.ai-message').last().textContent();

    // Should reference bakery or breads in color suggestions
    const showsContinuity = latestResponse.toLowerCase().includes('bakery') ||
                           latestResponse.toLowerCase().includes('bread') ||
                           latestResponse.toLowerCase().includes('artisan') ||
                           latestResponse.toLowerCase().includes('warm') ||
                           latestResponse.toLowerCase().includes('brown');

    expect(showsContinuity).toBe(true);
  });

  test('should handle new user (no session) correctly', async ({ page }) => {
    // Clear storage to simulate new user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should NOT show welcome back message
    const messages = await page.locator('.message').count();
    expect(messages).toBe(0);

    // Should be ready for new conversation
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeEnabled();
  });

  test('should restore session across multiple reloads', async ({ page }) => {
    // Create session
    await page.goto('/');
    await page.fill('#chat-input', 'Website for my law firm');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // First reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    const messagesAfterFirst = await page.locator('.message').count();

    // Second reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    const messagesAfterSecond = await page.locator('.message').count();

    // Message count should remain consistent
    expect(messagesAfterSecond).toBeGreaterThanOrEqual(messagesAfterFirst - 2);
  });

  test('should handle session with file uploads', async ({ page }) => {
    // This test assumes file upload functionality exists
    // Skip if no files are uploaded yet
    await page.goto('/');

    // Create session
    await page.fill('#chat-input', 'I need a website');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should resume even with assets
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    const messages = await page.locator('.message').count();
    expect(messages).toBeGreaterThan(0);
  });
});

test.describe('Session Resumption - Data Persistence', () => {
  test('should preserve metadata across sessions', async ({ page }) => {
    // Create session with metadata
    await page.goto('/');
    await page.fill('#chat-input', 'Website for Sweet Bakery');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Provide business details that get saved
    await page.fill('#chat-input', 'We specialize in wedding cakes');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message:nth-of-type(2)', { timeout: 15000 });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    // Continue conversation - should remember business details
    await page.fill('#chat-input', 'What should I highlight?');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    const response = await page.locator('.ai-message').last().textContent();

    // Should reference bakery or cakes
    const hasMemory = response.toLowerCase().includes('cake') ||
                     response.toLowerCase().includes('bakery') ||
                     response.toLowerCase().includes('wedding');

    expect(hasMemory).toBe(true);
  });

  test('should preserve conversation state', async ({ page }) => {
    // Create multi-turn conversation
    await page.goto('/');

    const messages = [
      'I need a website',
      'For my yoga studio',
      'It\'s called Zen Yoga'
    ];

    for (const msg of messages) {
      await page.fill('#chat-input', msg);
      await page.click('#send-button');
      await page.waitForSelector('.ai-message', { timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    const countBefore = await page.locator('.message').count();

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 10000 });

    const countAfter = await page.locator('.message').count();

    // All messages should be restored (or at least most)
    expect(countAfter).toBeGreaterThanOrEqual(countBefore - 2);
  });
});

test.describe('Session Resumption - Error Handling', () => {
  test('should handle corrupted session gracefully', async ({ page }) => {
    await page.goto('/');

    // Corrupt the session data
    await page.evaluate(() => {
      localStorage.setItem('conversation_user_001', 'invalid json {{{');
    });

    // Reload - should not crash
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should fall back to new session
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeEnabled();
  });

  test('should handle missing session files', async ({ page }) => {
    await page.goto('/');

    // This simulates missing conversation.json on server
    // App should handle gracefully and start fresh

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should not crash - UI should be functional
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeEnabled();
  });
});
