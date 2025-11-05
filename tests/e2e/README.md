# E2E Testing Suite - Implementation Guide

## Overview

This directory contains End-to-End tests for NITYA V1.2 using Playwright. These tests validate complete user flows from browser to backend.

## Test Files Created

### 1. ✅ new-session.spec.js (COMPLETE)
Tests first-time user experience:
- Initial load and UI rendering
- First message and response
- Multi-turn conversation
- Keyboard shortcuts
- Device toggle functionality
- Resizable layout
- Performance benchmarks

### 2. session-resumption.spec.js (TO IMPLEMENT)
Tests returning user experience:
```javascript
// Key test scenarios:
// - Detect existing session on page load
// - Load previous conversation history
// - Display "Welcome back" message
// - SYSTEM message triggers all 5 MCP tools
// - Context is restored (metadata, sitemap, styles, assets)
// - Continue conversation from where left off
// - Verify MCP tools auto-fire on resumption
```

### 3. preview-generation.spec.js (TO IMPLEMENT)
Tests preview system and tag detection:
```javascript
// Key test scenarios:
// - Detect [PREVIEW: section=hero] tags in AI responses
// - Update preview iframe when tags detected
// - Verify HTML injection into preview
// - Test device toggle after preview update
// - Verify preview persistence across messages
// - Test multiple section updates (hero, features, footer)
// - Validate preview loads correctly
```

### 4. file-selection.spec.js (TO IMPLEMENT)
Tests fileviewer postMessage communication:
```javascript
// Key test scenarios:
// - Load fileviewer iframe
// - Display uploaded files
// - Click on file in fileviewer
// - postMessage sent to parent window
// - Message appears in chat with filename
// - AI responds to file selection
// - Verify event.origin validation
// - Test multiple file selections
```

### 5. performance.spec.js (TO IMPLEMENT)
Tests performance benchmarks:
```javascript
// Key metrics:
// - Initial load: < 1.5s
// - First interaction: < 2s
// - Message send-to-display: < 500ms
// - Tool execution: < 1s
// - Preview update: < 300ms
// - Device toggle: < 100ms
// - Memory usage baseline
// - No memory leaks over 50 interactions
```

## Running E2E Tests

### Prerequisites
```bash
# 1. Install dependencies
npm install

# 2. Ensure Anthropic API key is configured
# Edit config.js with valid API key

# 3. Install Playwright browsers
npx playwright install
```

### Run All E2E Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/new-session.spec.js

# Run with UI mode (debugging)
npx playwright test --ui

# Run with headed browser
npx playwright test --headed
```

### Run with Different Browsers
```bash
# Chromium (default)
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# WebKit (Safari)
npx playwright test --project=webkit
```

### Debugging
```bash
# Run with debug mode
npx playwright test --debug

# Generate trace
npx playwright test --trace on

# View test report
npx playwright show-report
```

## Test Environment Setup

### 1. Test User Data
E2E tests create temporary user data:
```
prospects/
└── e2e_test_user_<timestamp>/
    ├── assets/
    ├── metadata.json
    ├── sitemap.json
    ├── styles.css
    ├── conversation.json
    └── index.html
```

### 2. Cleanup
Tests automatically clean up after completion. Manual cleanup:
```bash
# Remove test user directories
rm -rf prospects/e2e_test_*
```

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Initial Load | < 1.5s | Yes |
| First Message | < 2s | No (API dependent) |
| UI Interaction | < 100ms | Yes |
| Tool Execution | < 1s | Yes |
| Preview Update | < 300ms | Yes |
| Device Toggle | < 100ms | Yes |

## Known Issues & Limitations

### 1. API Rate Limits
- Tests hit real Anthropic API
- May fail with rate limiting
- Consider implementing API mocking for CI/CD

### 2. Timing Issues
- API response times vary (1-10s)
- Tests include generous timeouts
- May fail on slow connections

### 3. State Isolation
- Tests should be independent
- Use unique userIds per test
- Clean up state after each test

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage

### Functional Coverage
- ✅ New user onboarding
- ✅ Message send/receive
- ✅ Multi-turn conversation
- ⏳ Session resumption
- ⏳ File upload
- ⏳ Preview generation
- ⏳ Tag detection
- ⏳ Device toggle
- ⏳ Resizable layout

### Browser Coverage
- ✅ Chromium (primary)
- ⏳ Firefox
- ⏳ WebKit/Safari

### Device Coverage
- ✅ Desktop (1280x720)
- ⏳ Tablet (768x1024)
- ⏳ Mobile (375x667)

## Troubleshooting

### Test Fails: "Timeout waiting for selector"
- Increase timeout in playwright.config.js
- Check if element selector is correct
- Verify application is running

### Test Fails: "API Key Invalid"
- Check config.js has valid API key
- Verify API key has correct permissions
- Check rate limits

### Test Fails: "Port 3000 already in use"
- Stop existing server: `pkill -f "node.*server"`
- Or change port in playwright.config.js

### Flaky Tests
- Add explicit waits: `await page.waitForTimeout(1000)`
- Use more specific selectors
- Verify state before actions

## Next Steps

1. **Complete Remaining E2E Tests**
   - Implement session-resumption.spec.js
   - Implement preview-generation.spec.js
   - Implement file-selection.spec.js
   - Implement performance.spec.js

2. **Add Visual Regression Testing**
   - Screenshot comparison
   - Detect unintended UI changes

3. **API Mocking**
   - Mock Anthropic API for faster tests
   - Reduce API costs in CI/CD

4. **Cross-Browser Testing**
   - Enable Firefox and WebKit
   - Test on real mobile devices

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
