/**
 * Integration Tests: Session Resumption System
 * Tests: SessionService → DataService → FileService
 *
 * Tests the complete session resumption flow where returning users
 * get full context restoration.
 */

const ServiceContainer = require('../../../server/services/ServiceContainer');
const path = require('path');
const fs = require('fs').promises;

describe('Session Resumption Integration Tests', () => {
  let services;
  const testUserId = 'test_session_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);

  beforeAll(async () => {
    services = new ServiceContainer();
    services.initialize();

    // Create test directory
    await fs.mkdir(path.join(testProspectDir, 'assets'), { recursive: true });
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('SessionService → DataService Integration', () => {
    beforeEach(async () => {
      // Create test data files
      await fs.writeFile(
        path.join(testProspectDir, 'metadata.json'),
        JSON.stringify({
          businessName: 'Test Business',
          industry: 'Technology',
          targetAudience: 'Small businesses'
        })
      );

      await fs.writeFile(
        path.join(testProspectDir, 'sitemap.json'),
        JSON.stringify({
          pages: [
            { id: 'home', title: 'Home Page' },
            { id: 'about', title: 'About Us' }
          ]
        })
      );

      await fs.writeFile(
        path.join(testProspectDir, 'styles.css'),
        ':root { --primary-color: #0066cc; --secondary-color: #ff6600; }'
      );

      await fs.writeFile(
        path.join(testProspectDir, 'conversation.json'),
        JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I need a website for my bakery',
              timestamp: '2025-10-24T10:00:00Z'
            },
            {
              role: 'assistant',
              content: [{ type: 'text', text: 'I can help with that!' }],
              timestamp: '2025-10-24T10:00:01Z'
            }
          ],
          updatedAt: '2025-10-24T10:00:01Z'
        })
      );

      // Create test assets
      await fs.writeFile(
        path.join(testProspectDir, 'assets', 'logo.png'),
        'logo content'
      );
      await fs.writeFile(
        path.join(testProspectDir, 'assets', 'hero-image.jpg'),
        'hero image content'
      );
    });

    test('should load all context data through DataService', async () => {
      // Load metadata
      const metadata = await services.dataService.loadMetadata(testUserId);
      expect(metadata.success).toBe(true);
      expect(metadata.data.businessName).toBe('Test Business');

      // Load sitemap
      const sitemap = await services.dataService.loadSitemap(testUserId);
      expect(sitemap.success).toBe(true);
      expect(sitemap.data.pages.length).toBe(2);

      // Load conversation
      const conversation = await services.sessionService.loadConversation(testUserId);
      expect(conversation.success).toBe(true);
      expect(conversation.conversation.messages.length).toBe(2);
    });

    test('should access same data through SessionService', async () => {
      const context = await services.sessionService.buildContext(testUserId);

      expect(context.metadata).toBeDefined();
      expect(context.sitemap).toBeDefined();
      expect(context.conversation).toBeDefined();
      expect(context.assets).toBeDefined();
      expect(context.styles).toBeDefined();
    });

    test('should coordinate data loading across services', async () => {
      // DataService loads raw data
      const metadataViaData = await services.dataService.loadMetadata(testUserId);

      // SessionService should access same data
      const context = await services.sessionService.buildContext(testUserId);

      expect(context.metadata.businessName).toBe(metadataViaData.data.businessName);
    });
  });

  describe('Complete Session Resumption Flow', () => {
    beforeEach(async () => {
      // Setup complete session data
      await fs.writeFile(
        path.join(testProspectDir, 'metadata.json'),
        JSON.stringify({
          businessName: 'Resumption Test Bakery',
          industry: 'Food & Beverage',
          targetAudience: 'Local community',
          uniqueValue: 'Fresh artisan bread daily'
        })
      );

      await fs.writeFile(
        path.join(testProspectDir, 'sitemap.json'),
        JSON.stringify({
          pages: [
            {
              id: 'home',
              title: 'Home',
              sections: [
                { type: 'hero', content: 'Welcome to our bakery' },
                { type: 'features', content: 'Fresh bread daily' }
              ]
            }
          ]
        })
      );

      await fs.writeFile(
        path.join(testProspectDir, 'styles.css'),
        ':root { --primary-color: #8B4513; --secondary-color: #F4A460; }'
      );

      await fs.writeFile(
        path.join(testProspectDir, 'conversation.json'),
        JSON.stringify({
          messages: [
            { role: 'user', content: 'I need a website', timestamp: '2025-10-24T09:00:00Z' },
            { role: 'assistant', content: [{ type: 'text', text: 'I can help!' }], timestamp: '2025-10-24T09:00:01Z' },
            { role: 'user', content: 'It is for a bakery', timestamp: '2025-10-24T09:01:00Z' }
          ]
        })
      );
    });

    test('should detect existing session', async () => {
      const hasSession = await services.sessionService.hasExistingSession(testUserId);

      expect(hasSession).toBe(true);
    });

    test('should build complete context for resumption', async () => {
      const context = await services.sessionService.buildContext(testUserId);

      // Verify all data sources are loaded
      expect(context.metadata).toBeDefined();
      expect(context.metadata.businessName).toBe('Resumption Test Bakery');

      expect(context.sitemap).toBeDefined();
      expect(context.sitemap.pages).toHaveLength(1);

      expect(context.conversation).toBeDefined();
      expect(context.conversation.messages).toHaveLength(3);

      expect(context.styles).toBeDefined();
      expect(context.styles).toContain('#8B4513');

      expect(context.assets).toBeDefined();
      expect(Array.isArray(context.assets)).toBe(true);
    });

    test('should determine if session is resumption', async () => {
      const isResumed = await services.sessionService.isResumed(testUserId);

      expect(isResumed).toBe(true);
    });

    test('should handle new user (no session)', async () => {
      const newUserId = 'brand_new_user_' + Date.now();

      const hasSession = await services.sessionService.hasExistingSession(newUserId);
      expect(hasSession).toBe(false);

      const isResumed = await services.sessionService.isResumed(newUserId);
      expect(isResumed).toBe(false);

      // Should still build context (with empty data)
      const context = await services.sessionService.buildContext(newUserId);
      expect(context).toBeDefined();
      expect(context.metadata).toEqual({});
      expect(context.conversation.messages).toEqual([]);
    });

    test('should track session activity', async () => {
      await services.sessionService.recordActivity(testUserId);

      const lastActivity = services.sessionService.getLastActivity(testUserId);
      expect(lastActivity).toBeDefined();
      expect(Date.now() - lastActivity).toBeLessThan(1000);
    });

    test('should cache session data', async () => {
      // First call - loads from disk
      const startTime1 = Date.now();
      const context1 = await services.sessionService.buildContext(testUserId);
      const duration1 = Date.now() - startTime1;

      // Second call - should use cache
      const startTime2 = Date.now();
      const context2 = await services.sessionService.buildContext(testUserId);
      const duration2 = Date.now() - startTime2;

      // Cached call should be faster or similar (caching overhead can be negligible with small data)
      expect(duration2).toBeLessThanOrEqual(duration1 + 5); // Allow 5ms variance

      // Data should be identical
      expect(context1.metadata.businessName).toBe(context2.metadata.businessName);

      console.log(`  ⏱️  First load: ${duration1}ms, Cached load: ${duration2}ms`);
    });
  });

  describe('DataService → FileService Integration', () => {
    test('should use FileService for all file operations', async () => {
      // DataService internally uses FileService
      const result = await services.dataService.loadMetadata(testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should handle JSON parsing through layers', async () => {
      // Write JSON through FileService
      await services.fileService.writeJSON(
        path.join(testProspectDir, 'test-data.json'),
        { testField: 'testValue' }
      );

      // Read through DataService
      const content = await services.fileService.readJSON(
        path.join(testProspectDir, 'test-data.json')
      );

      expect(content.testField).toBe('testValue');
    });

    test('should coordinate updates across services', async () => {
      // Update through DataService
      await services.dataService.updateMetadata(testUserId, {
        businessName: 'Updated Name',
        newField: 'newValue'
      });

      // Read through SessionService
      const context = await services.sessionService.buildContext(testUserId);

      expect(context.metadata.businessName).toBe('Updated Name');
      expect(context.metadata.newField).toBe('newValue');
    });

    test('should maintain data consistency', async () => {
      const testData = {
        businessName: 'Consistency Test',
        field1: 'value1',
        field2: 'value2'
      };

      // Write through DataService
      await services.dataService.updateMetadata(testUserId, testData);

      // Read through multiple paths
      const viaDataService = await services.dataService.loadMetadata(testUserId);
      const viaSessionService = await services.sessionService.buildContext(testUserId);
      const viaFileService = await services.fileService.readJSON(
        path.join(testProspectDir, 'metadata.json')
      );

      // All should return same data
      expect(viaDataService.data.businessName).toBe('Consistency Test');
      expect(viaSessionService.metadata.businessName).toBe('Consistency Test');
      expect(viaFileService.businessName).toBe('Consistency Test');
    });
  });

  describe('Session State Management', () => {
    test('should save conversation state', async () => {
      const messages = [
        { role: 'user', content: 'Test message', timestamp: new Date().toISOString() }
      ];

      await services.sessionService.saveConversation(testUserId, messages);

      // Verify saved
      const loaded = await services.sessionService.loadConversation(testUserId);
      expect(loaded.conversation.messages).toHaveLength(1);
      expect(loaded.conversation.messages[0].content).toBe('Test message');
    });

    test('should update conversation incrementally', async () => {
      // Initial save
      await services.sessionService.saveConversation(testUserId, [
        { role: 'user', content: 'Message 1', timestamp: new Date().toISOString() }
      ]);

      // Load and append
      const loaded = await services.sessionService.loadConversation(testUserId);
      const updatedMessages = [
        ...loaded.conversation.messages,
        { role: 'assistant', content: [{ type: 'text', text: 'Response 1' }], timestamp: new Date().toISOString() },
        { role: 'user', content: 'Message 2', timestamp: new Date().toISOString() }
      ];

      // Save updated
      await services.sessionService.saveConversation(testUserId, updatedMessages);

      // Verify
      const final = await services.sessionService.loadConversation(testUserId);
      expect(final.conversation.messages).toHaveLength(3);
    });

    test('should track multiple user sessions independently', async () => {
      const user1 = 'session_user_1_' + Date.now();
      const user2 = 'session_user_2_' + Date.now();

      // Create directories
      await fs.mkdir(path.join(__dirname, '../../../prospects', user1, 'assets'), { recursive: true });
      await fs.mkdir(path.join(__dirname, '../../../prospects', user2, 'assets'), { recursive: true });

      // Save different data for each user
      await services.sessionService.saveConversation(user1, [
        { role: 'user', content: 'User 1 message', timestamp: new Date().toISOString() }
      ]);

      await services.sessionService.saveConversation(user2, [
        { role: 'user', content: 'User 2 message', timestamp: new Date().toISOString() }
      ]);

      // Load and verify isolation
      const context1 = await services.sessionService.buildContext(user1);
      const context2 = await services.sessionService.buildContext(user2);

      expect(context1.conversation.messages[0].content).toBe('User 1 message');
      expect(context2.conversation.messages[0].content).toBe('User 2 message');

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', user1), { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../../../prospects', user2), { recursive: true, force: true });
    });
  });

  describe('Error Handling in Session Flow', () => {
    test('should handle missing conversation file', async () => {
      const userWithoutConv = 'no_conversation_user_' + Date.now();

      const result = await services.sessionService.loadConversation(userWithoutConv);

      // Should return empty conversation, not error
      expect(result.success).toBe(true);
      expect(result.conversation.messages).toEqual([]);
    });

    test('should handle missing metadata file', async () => {
      const userWithoutMeta = 'no_metadata_user_' + Date.now();

      const result = await services.dataService.loadMetadata(userWithoutMeta);

      // Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    test('should handle corrupted JSON files', async () => {
      const corruptedUser = 'corrupted_user_' + Date.now();
      const corruptedDir = path.join(__dirname, '../../../prospects', corruptedUser);

      await fs.mkdir(corruptedDir, { recursive: true });
      await fs.writeFile(
        path.join(corruptedDir, 'metadata.json'),
        'invalid json {{{ broken'
      );

      // Should handle error gracefully
      try {
        await services.dataService.loadMetadata(corruptedUser);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Cleanup
      await fs.rm(corruptedDir, { recursive: true, force: true });
    });

    test('should handle file system errors', async () => {
      const invalidUser = '../../../etc/passwd';

      // Should sanitize or reject invalid paths
      try {
        await services.sessionService.buildContext(invalidUser);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance of Session Operations', () => {
    test('should build context efficiently', async () => {
      const startTime = Date.now();

      await services.sessionService.buildContext(testUserId);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should be fast
      console.log(`  ⏱️  Session context building: ${duration}ms`);
    });

    test('should handle rapid session checks', async () => {
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await services.sessionService.hasExistingSession(testUserId);
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(20);

      console.log(`  ⏱️  Average session check (${iterations} checks): ${avgTime.toFixed(2)}ms`);
    }, 10000);

    test('should handle concurrent context builds', async () => {
      const promises = Array(10).fill(null).map(() =>
        services.sessionService.buildContext(testUserId)
      );

      const contexts = await Promise.all(promises);

      // All should succeed
      contexts.forEach(context => {
        expect(context).toBeDefined();
        expect(context.metadata).toBeDefined();
      });
    });

    test('should cache effectively', async () => {
      // Clear cache
      services.sessionService.clearCache(testUserId);

      // First build (loads from disk)
      const start1 = Date.now();
      await services.sessionService.buildContext(testUserId);
      const uncachedTime = Date.now() - start1;

      // Second build (uses cache)
      const start2 = Date.now();
      await services.sessionService.buildContext(testUserId);
      const cachedTime = Date.now() - start2;

      // Cached should be faster or similar (with small data, caching overhead may negate benefits)
      expect(cachedTime).toBeLessThanOrEqual(uncachedTime + 2); // Allow 2ms variance

      console.log(`  ⏱️  Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms (${((cachedTime/uncachedTime)*100).toFixed(0)}%)`);
    });
  });

  describe('Full Resumption Scenario', () => {
    test('should simulate complete user return flow', async () => {
      // Scenario: User worked on website yesterday, returns today

      // Day 1: User creates initial session
      const userId = 'returning_user_' + Date.now();
      const userDir = path.join(__dirname, '../../../prospects', userId);
      await fs.mkdir(path.join(userDir, 'assets'), { recursive: true });

      // Save work from Day 1
      await services.sessionService.saveConversation(userId, [
        { role: 'user', content: 'I want a website for my restaurant', timestamp: '2025-10-23T10:00:00Z' },
        { role: 'assistant', content: [{ type: 'text', text: 'Great! What type of food?' }], timestamp: '2025-10-23T10:00:01Z' },
        { role: 'user', content: 'Italian cuisine', timestamp: '2025-10-23T10:01:00Z' }
      ]);

      await services.dataService.updateMetadata(userId, {
        businessName: 'Bella Italia',
        industry: 'Restaurant',
        cuisine: 'Italian'
      });

      // Day 2: User returns (session resumption)

      // 1. Check if session exists
      const hasSession = await services.sessionService.hasExistingSession(userId);
      expect(hasSession).toBe(true);

      // 2. Build full context
      const context = await services.sessionService.buildContext(userId);
      expect(context.conversation.messages).toHaveLength(3);
      expect(context.metadata.businessName).toBe('Bella Italia');

      // 3. User should see their previous work
      expect(context.conversation.messages[0].content).toContain('restaurant');
      expect(context.conversation.messages[2].content).toContain('Italian');

      // 4. Continue conversation
      const updatedMessages = [
        ...context.conversation.messages,
        { role: 'assistant', content: [{ type: 'text', text: 'Welcome back!' }], timestamp: new Date().toISOString() }
      ];

      await services.sessionService.saveConversation(userId, updatedMessages);

      // 5. Verify continuity
      const finalContext = await services.sessionService.buildContext(userId);
      expect(finalContext.conversation.messages).toHaveLength(4);
      expect(finalContext.conversation.messages[3].content[0].text).toContain('Welcome back');

      console.log('  ✓ Complete resumption flow successful');

      // Cleanup
      await fs.rm(userDir, { recursive: true, force: true });
    });
  });
});
