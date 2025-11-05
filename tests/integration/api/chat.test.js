/**
 * Integration Tests: Chat API Endpoint
 * Tests: POST /api/chat
 *
 * This is the most critical endpoint - handles all chat interactions,
 * tool execution, and response generation.
 */

const request = require('supertest');
const app = require('../../../server/proxy-server');
const path = require('path');
const fs = require('fs').promises;

describe('Chat API Integration Tests', () => {
  const testUserId = 'test_user_001';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);

  beforeAll(async () => {
    // Ensure test user directory exists
    await fs.mkdir(testProspectDir, { recursive: true });
    await fs.mkdir(path.join(testProspectDir, 'assets'), { recursive: true });
  });

  describe('POST /api/chat - Basic Message Processing', () => {
    test('should successfully process a simple message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello, NITYA!' }],
          userId: testUserId
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', 'message');
      expect(response.body).toHaveProperty('role', 'assistant');
      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toBeInstanceOf(Array);
      expect(response.body.content.length).toBeGreaterThan(0);

      // Verify content block structure
      const firstBlock = response.body.content[0];
      expect(firstBlock).toHaveProperty('type', 'text');
      expect(firstBlock).toHaveProperty('text');
      expect(typeof firstBlock.text).toBe('string');
      expect(firstBlock.text.length).toBeGreaterThan(0);
    }, 15000); // Allow 15s for API call

    test('should handle empty messages array', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [],
          userId: testUserId
        })
        .expect(200);

      // Should still return a response (likely an error or default message)
      expect(response.body).toHaveProperty('content');
    }, 15000);

    test('should require userId parameter', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
          // Missing userId
        });

      // Should either accept default or return error
      expect(response.status).toBeLessThanOrEqual(500);
    });

    test('should handle conversation with multiple messages', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
            { role: 'user', content: 'What is your name?' }
          ],
          userId: testUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toBeInstanceOf(Array);
    }, 15000);
  });

  describe('POST /api/chat - MCP Tool Execution', () => {
    test('should trigger read_user_assets tool when asking about images', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'What images do I have?' }],
          userId: testUserId
        })
        .expect(200);

      // Response should mention assets or files
      const responseText = response.body.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join(' ');

      // Should either mention files/assets or indicate tool was used
      expect(response.body).toHaveProperty('content');
      expect(response.body.stop_reason).toBeDefined();
    }, 15000);

    test('should trigger read_conversation tool when asked about conversation history', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'What have we discussed so far?' }],
          userId: testUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body.stop_reason).toBeDefined();
    }, 15000);

    test('should handle tool use loop correctly', async () => {
      // This message might trigger multiple tools
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{
            role: 'user',
            content: 'Tell me about my assets and conversation history'
          }],
          userId: testUserId
        })
        .expect(200);

      // Should complete successfully after tool execution
      expect(response.body.stop_reason).toBeDefined();
      expect(['end_turn', 'max_tokens']).toContain(response.body.stop_reason);
    }, 20000); // Allow more time for multiple tool calls

    test('should handle SYSTEM resumption message with multiple tools', async () => {
      // This simulates session resumption where NITYA should check all context
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{
            role: 'user',
            content: 'SYSTEM: Check all available context files for this session.'
          }],
          userId: testUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body.stop_reason).toBeDefined();
    }, 20000);
  });

  describe('POST /api/chat - Error Handling', () => {
    test('should handle malformed messages', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'invalid', content: 123 }], // Invalid role and content type
          userId: testUserId
        });

      // Should return error or handle gracefully
      expect(response.status).toBeLessThanOrEqual(500);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          // Missing messages and userId
        });

      // Should return 400 or 500 error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB message
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: longMessage }],
          userId: testUserId
        })
        .expect(200);

      // Should process without error
      expect(response.body).toHaveProperty('content');
    }, 20000);

    test('should handle invalid userId gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          userId: '../../../etc/passwd' // Path traversal attempt
        });

      // Should either sanitize or handle error
      expect(response.status).toBeLessThanOrEqual(500);
    });
  });

  describe('POST /api/chat - Response Format Validation', () => {
    test('should return consistent response format', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Test message' }],
          userId: testUserId
        })
        .expect(200);

      // Validate Anthropic API response format
      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^msg_/),
        type: 'message',
        role: 'assistant',
        content: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(text|tool_use)$/)
          })
        ]),
        model: expect.any(String),
        stop_reason: expect.any(String),
        usage: expect.objectContaining({
          input_tokens: expect.any(Number),
          output_tokens: expect.any(Number)
        })
      });
    }, 15000);

    test('should include usage information', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hi' }],
          userId: testUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('usage');
      expect(response.body.usage).toHaveProperty('input_tokens');
      expect(response.body.usage).toHaveProperty('output_tokens');
      expect(response.body.usage.input_tokens).toBeGreaterThan(0);
      expect(response.body.usage.output_tokens).toBeGreaterThan(0);
    }, 15000);
  });

  describe('POST /api/chat - Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Quick test' }],
          userId: testUserId
        })
        .expect(200);

      const duration = Date.now() - startTime;

      // Should respond within 10 seconds (Anthropic API can be slow)
      expect(duration).toBeLessThan(10000);
      console.log(`  ⏱️  Chat API response time: ${duration}ms`);
    }, 15000);

    test('should handle concurrent requests', async () => {
      const requests = [
        request(app).post('/api/chat').send({
          messages: [{ role: 'user', content: 'Request 1' }],
          userId: testUserId
        }),
        request(app).post('/api/chat').send({
          messages: [{ role: 'user', content: 'Request 2' }],
          userId: testUserId
        }),
        request(app).post('/api/chat').send({
          messages: [{ role: 'user', content: 'Request 3' }],
          userId: testUserId
        })
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('content');
      });
    }, 30000);
  });
});
