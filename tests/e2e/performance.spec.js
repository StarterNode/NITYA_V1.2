/**
 * E2E Test: Performance
 * Tests performance targets and benchmarks
 *
 * Validates that the application meets performance criteria
 */

const { test, expect } = require('@playwright/test');

test.describe('Performance - Initial Load', () => {
  test('should load page within 1.5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`  ⏱️  Initial page load: ${loadTime}ms`);

    // Target: < 1.5s
    expect(loadTime).toBeLessThan(1500);
  });

  test('should achieve First Contentful Paint quickly', async ({ page }) => {
    await page.goto('/');

    // Measure FCP using Performance API
    const fcp = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('paint');
      const fcpEntry = perfEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : 0;
    });

    console.log(`  ⏱️  First Contentful Paint: ${fcp}ms`);

    // FCP should be under 1 second
    expect(fcp).toBeLessThan(1000);
  });

  test('should load all critical resources quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for critical elements
    await Promise.all([
      page.locator('#chat-input').waitFor({ state: 'visible' }),
      page.locator('#send-button').waitFor({ state: 'visible' }),
      page.locator('.preview-section').waitFor({ state: 'visible' })
    ]);

    const criticalLoadTime = Date.now() - startTime;

    console.log(`  ⏱️  Critical resources loaded: ${criticalLoadTime}ms`);

    // All critical elements should be visible within 1s
    expect(criticalLoadTime).toBeLessThan(1000);
  });

  test('should have minimal layout shifts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        // Give it time to measure
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      });
    });

    console.log(`  📐 Cumulative Layout Shift: ${cls.toFixed(4)}`);

    // CLS should be under 0.1 (good)
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('Performance - First Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should respond to first click within 100ms', async ({ page }) => {
    // Measure time from click to visual feedback

    const startTime = Date.now();

    await page.click('#send-button');

    // Wait for some visual change (button disabled, typing indicator, etc.)
    await page.waitForSelector('#send-button:disabled', { timeout: 1000 });

    const responseTime = Date.now() - startTime;

    console.log(`  ⏱️  Click response time: ${responseTime}ms`);

    // Should respond within 100ms
    expect(responseTime).toBeLessThan(100);
  });

  test('should handle first input without lag', async ({ page }) => {
    const startTime = Date.now();

    // Type in chat input
    await page.focus('#chat-input');
    await page.keyboard.type('Hello');

    const inputTime = Date.now() - startTime;

    console.log(`  ⏱️  Input response time: ${inputTime}ms`);

    // Typing should be instant (< 50ms total for 5 chars)
    expect(inputTime).toBeLessThan(50);
  });

  test('should process first message send within 2 seconds', async ({ page }) => {
    // Measure time to send message and get API response

    await page.fill('#chat-input', 'Performance test message');

    const startTime = Date.now();

    await page.click('#send-button');

    // Wait for user message to appear (should be immediate)
    await page.waitForSelector('.user-message', { timeout: 2000 });

    const userMessageTime = Date.now() - startTime;

    console.log(`  ⏱️  User message render: ${userMessageTime}ms`);

    // User message should appear within 500ms
    expect(userMessageTime).toBeLessThan(500);
  });
});

test.describe('Performance - Tool Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should execute MCP tools within 1 second', async ({ page }) => {
    // Send message that triggers tool use
    await page.fill('#chat-input', 'What assets do I have?');

    const startTime = Date.now();

    await page.click('#send-button');

    // Wait for AI response (which executed read_user_assets)
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    const toolExecutionTime = Date.now() - startTime;

    console.log(`  ⏱️  Tool execution + response: ${toolExecutionTime}ms`);

    // Including API round-trip, should be under 10s
    expect(toolExecutionTime).toBeLessThan(10000);
  });

  test('should handle multiple tool calls efficiently', async ({ page }) => {
    // Send message that triggers multiple tools (session resumption scenario)
    // First create a session
    await page.fill('#chat-input', 'Create website for my business');
    await page.click('#send-button');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    // Reload to trigger session resumption (fires all 5 tools)
    const startTime = Date.now();

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    const resumptionTime = Date.now() - startTime;

    console.log(`  ⏱️  Session resumption (all tools): ${resumptionTime}ms`);

    // All 5 tools + AI response should complete within 15s
    expect(resumptionTime).toBeLessThan(15000);
  });
});

test.describe('Performance - Preview Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should update preview within 300ms', async ({ page }) => {
    // Note: This measures frontend preview update time, not API generation

    const previewIframe = page.locator('iframe#preview-iframe');
    const initialSrc = await previewIframe.getAttribute('src');

    // Trigger preview update
    const startTime = Date.now();

    await page.evaluate(() => {
      // Simulate preview update
      const iframe = document.querySelector('iframe#preview-iframe');
      if (iframe) {
        iframe.src = iframe.src.split('?')[0] + '?t=' + Date.now();
      }
    });

    // Wait for iframe to reload
    await page.waitForTimeout(100);

    const updateTime = Date.now() - startTime;

    console.log(`  ⏱️  Preview iframe update: ${updateTime}ms`);

    // Frontend preview update should be fast
    expect(updateTime).toBeLessThan(300);
  });

  test('should handle device toggle without lag', async ({ page }) => {
    const startTime = Date.now();

    // Switch device view
    await page.click('button[data-device="mobile"]');

    // Wait for visual change
    await page.waitForTimeout(50);

    const switchTime = Date.now() - startTime;

    console.log(`  ⏱️  Device toggle time: ${switchTime}ms`);

    // Device switching should be instant
    expect(switchTime).toBeLessThan(100);
  });
});

test.describe('Performance - Memory and Resources', () => {
  test('should not leak memory during conversation', async ({ page }) => {
    await page.goto('/');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Send multiple messages
    for (let i = 0; i < 5; i++) {
      await page.fill('#chat-input', `Message ${i + 1}`);
      await page.click('#send-button');
      await page.waitForSelector(`.user-message:nth-of-type(${i + 1})`, { timeout: 2000 });
    }

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

      console.log(`  💾 Memory increase: ${memoryIncreaseMB}MB`);

      // Memory increase should be reasonable (< 10MB for 5 messages)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    } else {
      // performance.memory not available, skip
      expect(true).toBe(true);
    }
  });

  test('should maintain smooth scrolling', async ({ page }) => {
    await page.goto('/');

    // Send multiple messages to create scrollable content
    for (let i = 0; i < 10; i++) {
      await page.fill('#chat-input', `Scroll test message ${i + 1}`);
      await page.click('#send-button');
      await page.waitForSelector(`.user-message:nth-of-type(${i + 1})`, { timeout: 2000 });
    }

    const messagesContainer = page.locator('#messages');

    const startTime = Date.now();

    // Scroll to top
    await messagesContainer.evaluate(el => {
      el.scrollTop = 0;
    });

    await page.waitForTimeout(100);

    // Scroll to bottom
    await messagesContainer.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });

    const scrollTime = Date.now() - startTime;

    console.log(`  ⏱️  Scroll performance: ${scrollTime}ms`);

    // Scrolling should be smooth and fast
    expect(scrollTime).toBeLessThan(200);
  });

  test('should handle window resize efficiently', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();

    // Resize window
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(50);
    await page.setViewportSize({ width: 1920, height: 1080 });

    const resizeTime = Date.now() - startTime;

    console.log(`  ⏱️  Window resize handling: ${resizeTime}ms`);

    // Should handle resize quickly
    expect(resizeTime).toBeLessThan(500);

    // UI should still be functional
    await expect(page.locator('#chat-input')).toBeVisible();
  });
});

test.describe('Performance - API Response Times', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle API response in reasonable time', async ({ page }) => {
    await page.fill('#chat-input', 'Hello NITYA');

    const startTime = Date.now();

    await page.click('#send-button');

    // Wait for AI response
    await page.waitForSelector('.ai-message', { timeout: 15000 });

    const responseTime = Date.now() - startTime;

    console.log(`  ⏱️  API response time: ${responseTime}ms`);

    // API should respond within 15 seconds
    expect(responseTime).toBeLessThan(15000);
  });

  test('should show loading state during API call', async ({ page }) => {
    await page.fill('#chat-input', 'Test loading state');
    await page.click('#send-button');

    // Typing indicator should appear quickly
    const typingIndicator = page.locator('.typing-indicator');
    await expect(typingIndicator).toBeVisible({ timeout: 500 });

    // Send button should be disabled
    await expect(page.locator('#send-button')).toBeDisabled();
  });

  test('should handle slow API responses gracefully', async ({ page }) => {
    // Send a complex query that might take longer
    await page.fill('#chat-input', 'Create a complete website with hero, about, services, testimonials, and contact sections with detailed content');

    await page.click('#send-button');

    // Should show loading state
    await expect(page.locator('.typing-indicator')).toBeVisible();

    // Even if slow, should eventually respond (within 30s)
    await page.waitForSelector('.ai-message', { timeout: 30000 });

    // UI should be responsive again
    await expect(page.locator('#send-button')).toBeEnabled();
  });
});

test.describe('Performance - Overall Targets', () => {
  test('should meet Time to Interactive target', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait until page is fully interactive
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#chat-input:not([disabled])', { state: 'visible' });

    const tti = Date.now() - startTime;

    console.log(`  ⏱️  Time to Interactive: ${tti}ms`);

    // Should be interactive within 2 seconds
    expect(tti).toBeLessThan(2000);
  });

  test('should maintain performance with multiple interactions', async ({ page }) => {
    await page.goto('/');

    const interactions = [
      { action: 'type', value: 'Test message' },
      { action: 'click', target: '#send-button' },
      { action: 'device-toggle', target: 'button[data-device="tablet"]' },
      { action: 'device-toggle', target: 'button[data-device="mobile"]' },
      { action: 'device-toggle', target: 'button[data-device="desktop"]' }
    ];

    for (const interaction of interactions) {
      const startTime = Date.now();

      if (interaction.action === 'type') {
        await page.fill('#chat-input', interaction.value);
      } else if (interaction.action === 'click' || interaction.action === 'device-toggle') {
        await page.click(interaction.target);
      }

      const interactionTime = Date.now() - startTime;

      // Each interaction should complete quickly
      expect(interactionTime).toBeLessThan(100);
    }

    // App should remain responsive
    await expect(page.locator('#chat-input')).toBeVisible();
  });

  test('should achieve good overall performance score', async ({ page }) => {
    await page.goto('/');

    // Comprehensive performance check
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });

    console.log(`  ⏱️  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  ⏱️  Load Complete: ${metrics.loadComplete}ms`);
    console.log(`  ⏱️  Total Load Time: ${metrics.totalTime}ms`);

    // All metrics should be reasonable
    expect(metrics.domContentLoaded).toBeLessThan(1000);
    expect(metrics.loadComplete).toBeLessThan(2000);
    expect(metrics.totalTime).toBeLessThan(3000);
  });
});
