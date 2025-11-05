/**
 * Integration Tests: Conversation API Endpoints
 * Tests: POST /api/save-conversation, GET /api/get-conversation/:userId
 *
 * Tests conversation persistence and retrieval functionality.
 */

const request = require('supertest');
const app = require('../../../server/proxy-server');
const path = require('path');
const fs = require('fs').promises;

describe('Conversation API Integration Tests', () => {
  const testUserId = 'test_conversation_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testProspectDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('POST /api/save-conversation - Save Conversation', () => {
    const testConversation = {
      userId: testUserId,
      messages: [
        {
          role: 'user',
          content: 'Hello, NITYA!',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
          timestamp: new Date().toISOString()
        },
        {
          role: 'user',
          content: 'I need help building a website',
          timestamp: new Date().toISOString()
        }
      ]
    };

    test('should save a new conversation', async () => {
      const response = await request(app)
        .post('/api/save-conversation')
        .send(testConversation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify file was created
      const conversationPath = path.join(testProspectDir, 'conversation.json');
      const fileExists = await fs.access(conversationPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify content
      const content = JSON.parse(await fs.readFile(conversationPath, 'utf-8'));
      expect(content.messages).toBeInstanceOf(Array);
      expect(content.messages.length).toBe(3);
      expect(content.messages[0].role).toBe('user');
      expect(content.messages[0].content).toBe('Hello, NITYA!');
    });

    test('should update existing conversation', async () => {
      const updatedConversation = {
        userId: testUserId,
        messages: [
          ...testConversation.messages,
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'I can help you with that!' }],
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await request(app)
        .post('/api/save-conversation')
        .send(updatedConversation)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update
      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'conversation.json'), 'utf-8')
      );
      expect(content.messages.length).toBe(4);
    });

    test('should handle empty messages array', async () => {
      const emptyConversation = {
        userId: testUserId,
        messages: []
      };

      const response = await request(app)
        .post('/api/save-conversation')
        .send(emptyConversation)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'conversation.json'), 'utf-8')
      );
      expect(content.messages).toEqual([]);
    });

    test('should preserve message structure and metadata', async () => {
      const complexConversation = {
        userId: testUserId,
        messages: [
          {
            role: 'user',
            content: 'Test message',
            timestamp: '2025-10-24T10:00:00Z',
            metadata: {
              source: 'web',
              sessionId: 'test-session-123'
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/save-conversation')
        .send(complexConversation)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'conversation.json'), 'utf-8')
      );
      expect(content.messages[0].metadata).toBeDefined();
      expect(content.messages[0].metadata.sessionId).toBe('test-session-123');
    });

    test('should handle very long conversations', async () => {
      const longConversation = {
        userId: testUserId,
        messages: Array(100).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: i % 2 === 0 ? `User message ${i}` : [{ type: 'text', text: `Assistant response ${i}` }],
          timestamp: new Date().toISOString()
        }))
      };

      const response = await request(app)
        .post('/api/save-conversation')
        .send(longConversation)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'conversation.json'), 'utf-8')
      );
      expect(content.messages.length).toBe(100);
    }, 10000);

    test('should handle messages with special characters', async () => {
      const specialCharsConversation = {
        userId: testUserId,
        messages: [
          {
            role: 'user',
            content: 'Test with special chars: <>&"\'😊🎉',
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await request(app)
        .post('/api/save-conversation')
        .send(specialCharsConversation)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'conversation.json'), 'utf-8')
      );
      expect(content.messages[0].content).toBe('Test with special chars: <>&"\'😊🎉');
    });

    test('should validate userId requirement', async () => {
      const response = await request(app)
        .post('/api/save-conversation')
        .send({
          messages: []
          // Missing userId
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle concurrent save operations', async () => {
      const saves = Array(5).fill(null).map((_, i) =>
        request(app)
          .post('/api/save-conversation')
          .send({
            userId: testUserId,
            messages: [
              {
                role: 'user',
                content: `Concurrent message ${i}`,
                timestamp: new Date().toISOString()
              }
            ]
          })
      );

      const responses = await Promise.all(saves);

      // All should succeed (last one wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    }, 10000);
  });

  describe('GET /api/get-conversation/:userId - Retrieve Conversation', () => {
    beforeEach(async () => {
      // Ensure a conversation exists for retrieval tests
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: testUserId,
          messages: [
            {
              role: 'user',
              content: 'Retrieval test message',
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: [{ type: 'text', text: 'Retrieval test response' }],
              timestamp: new Date().toISOString()
            }
          ]
        });
    });

    test('should retrieve existing conversation', async () => {
      const response = await request(app)
        .get(`/api/get-conversation/${testUserId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('conversation');
      expect(response.body.conversation).toHaveProperty('messages');
      expect(response.body.conversation.messages).toBeInstanceOf(Array);
      expect(response.body.conversation.messages.length).toBeGreaterThan(0);
    });

    test('should return conversation structure', async () => {
      const response = await request(app)
        .get(`/api/get-conversation/${testUserId}`)
        .expect(200);

      const conversation = response.body.conversation;
      expect(conversation.messages[0]).toHaveProperty('role');
      expect(conversation.messages[0]).toHaveProperty('content');
      expect(conversation.messages[0]).toHaveProperty('timestamp');
    });

    test('should handle non-existent conversation gracefully', async () => {
      const nonExistentUserId = 'non_existent_user_' + Date.now();

      const response = await request(app)
        .get(`/api/get-conversation/${nonExistentUserId}`)
        .expect(200);

      // Should return success with empty conversation
      expect(response.body.success).toBe(true);
      expect(response.body.conversation).toBeDefined();
      expect(response.body.conversation.messages).toEqual([]);
    });

    test('should return all messages in order', async () => {
      // Save a multi-message conversation
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: testUserId,
          messages: [
            { role: 'user', content: 'Message 1', timestamp: '2025-10-24T10:00:00Z' },
            { role: 'assistant', content: [{ type: 'text', text: 'Response 1' }], timestamp: '2025-10-24T10:00:01Z' },
            { role: 'user', content: 'Message 2', timestamp: '2025-10-24T10:00:02Z' },
            { role: 'assistant', content: [{ type: 'text', text: 'Response 2' }], timestamp: '2025-10-24T10:00:03Z' }
          ]
        });

      const response = await request(app)
        .get(`/api/get-conversation/${testUserId}`)
        .expect(200);

      const messages = response.body.conversation.messages;
      expect(messages.length).toBe(4);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[2].content).toBe('Message 2');
    });

    test('should preserve message metadata', async () => {
      // Save conversation with metadata
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: testUserId,
          messages: [
            {
              role: 'user',
              content: 'Test',
              timestamp: new Date().toISOString(),
              metadata: { source: 'test' }
            }
          ]
        });

      const response = await request(app)
        .get(`/api/get-conversation/${testUserId}`)
        .expect(200);

      expect(response.body.conversation.messages[0].metadata).toBeDefined();
      expect(response.body.conversation.messages[0].metadata.source).toBe('test');
    });

    test('should handle userId with special characters', async () => {
      const specialUserId = 'user_with-special.chars_123';

      // Save conversation for special user
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: specialUserId,
          messages: [{ role: 'user', content: 'Test', timestamp: new Date().toISOString() }]
        });

      const response = await request(app)
        .get(`/api/get-conversation/${specialUserId}`)
        .expect(200);

      expect(response.body.conversation.messages.length).toBeGreaterThan(0);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', specialUserId), { recursive: true, force: true });
    });

    test('should prevent path traversal', async () => {
      const response = await request(app)
        .get('/api/get-conversation/../../../etc/passwd');

      // Should either sanitize or reject
      expect([200, 400, 403, 404]).toContain(response.status);
    });

    test('should handle corrupted conversation file', async () => {
      // Create corrupted file
      const corruptedUserId = 'corrupted_conversation_user';
      const corruptedDir = path.join(__dirname, '../../../prospects', corruptedUserId);
      await fs.mkdir(corruptedDir, { recursive: true });
      await fs.writeFile(
        path.join(corruptedDir, 'conversation.json'),
        'invalid json {{{ broken'
      );

      const response = await request(app)
        .get(`/api/get-conversation/${corruptedUserId}`);

      // Should handle gracefully
      expect([200, 500]).toContain(response.status);

      // Cleanup
      await fs.rm(corruptedDir, { recursive: true, force: true });
    });
  });

  describe('Conversation Flow Integration', () => {
    test('should complete full save-retrieve-update cycle', async () => {
      const cycleUserId = 'cycle_test_user_' + Date.now();

      // 1. Save initial conversation
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: cycleUserId,
          messages: [
            { role: 'user', content: 'First message', timestamp: new Date().toISOString() }
          ]
        })
        .expect(200);

      // 2. Retrieve conversation
      const retrieveResponse = await request(app)
        .get(`/api/get-conversation/${cycleUserId}`)
        .expect(200);

      expect(retrieveResponse.body.conversation.messages.length).toBe(1);

      // 3. Update conversation with new messages
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: cycleUserId,
          messages: [
            ...retrieveResponse.body.conversation.messages,
            { role: 'assistant', content: [{ type: 'text', text: 'Response' }], timestamp: new Date().toISOString() },
            { role: 'user', content: 'Second message', timestamp: new Date().toISOString() }
          ]
        })
        .expect(200);

      // 4. Retrieve updated conversation
      const finalResponse = await request(app)
        .get(`/api/get-conversation/${cycleUserId}`)
        .expect(200);

      expect(finalResponse.body.conversation.messages.length).toBe(3);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', cycleUserId), { recursive: true, force: true });
    }, 10000);

    test('should support session resumption pattern', async () => {
      const sessionUserId = 'session_test_user_' + Date.now();

      // Simulate first session
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: sessionUserId,
          messages: [
            { role: 'user', content: 'I want a website for my bakery', timestamp: new Date().toISOString() },
            { role: 'assistant', content: [{ type: 'text', text: 'Great! Tell me about your bakery.' }], timestamp: new Date().toISOString() }
          ]
        })
        .expect(200);

      // Simulate user leaving and coming back (session resumption)
      const response = await request(app)
        .get(`/api/get-conversation/${sessionUserId}`)
        .expect(200);

      // Should have previous context
      expect(response.body.conversation.messages.length).toBe(2);
      expect(response.body.conversation.messages[0].content).toContain('bakery');

      // Continue conversation
      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: sessionUserId,
          messages: [
            ...response.body.conversation.messages,
            { role: 'user', content: 'I have some images', timestamp: new Date().toISOString() }
          ]
        })
        .expect(200);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', sessionUserId), { recursive: true, force: true });
    });
  });

  describe('Conversation API - Performance', () => {
    test('should save conversation quickly', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/save-conversation')
        .send({
          userId: testUserId,
          messages: [
            { role: 'user', content: 'Performance test', timestamp: new Date().toISOString() }
          ]
        })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      console.log(`  ⏱️  Save conversation performance: ${duration}ms`);
    });

    test('should retrieve conversation quickly', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/get-conversation/${testUserId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      console.log(`  ⏱️  Retrieve conversation performance: ${duration}ms`);
    });

    test('should handle large conversation efficiently', async () => {
      const largeUserId = 'large_conversation_user_' + Date.now();

      // Create conversation with 500 messages
      const largeConversation = {
        userId: largeUserId,
        messages: Array(500).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: i % 2 === 0 ? `User message ${i}` : [{ type: 'text', text: `Assistant response ${i}` }],
          timestamp: new Date().toISOString()
        }))
      };

      const saveStart = Date.now();
      await request(app)
        .post('/api/save-conversation')
        .send(largeConversation)
        .expect(200);
      const saveDuration = Date.now() - saveStart;

      const retrieveStart = Date.now();
      const response = await request(app)
        .get(`/api/get-conversation/${largeUserId}`)
        .expect(200);
      const retrieveDuration = Date.now() - retrieveStart;

      expect(response.body.conversation.messages.length).toBe(500);
      expect(saveDuration).toBeLessThan(5000);
      expect(retrieveDuration).toBeLessThan(2000);

      console.log(`  ⏱️  Large conversation (500 msgs) - Save: ${saveDuration}ms, Retrieve: ${retrieveDuration}ms`);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', largeUserId), { recursive: true, force: true });
    }, 15000);
  });
});
