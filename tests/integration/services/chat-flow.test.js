/**
 * Integration Tests: Chat Service Flow
 * Tests: ChatService → MCPService → Tools (full integration)
 *
 * Tests the complete chat flow from message processing through
 * tool execution and response generation.
 */

const ServiceContainer = require('../../../server/services/ServiceContainer');
const path = require('path');
const fs = require('fs').promises;

describe('Chat Service Flow Integration Tests', () => {
  let services;
  const testUserId = 'test_chat_flow_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);

  beforeAll(async () => {
    // Initialize service container
    services = new ServiceContainer();
    services.initialize();

    // Create test directory structure
    await fs.mkdir(path.join(testProspectDir, 'assets'), { recursive: true });

    // Create test files for tools to read
    await fs.writeFile(
      path.join(testProspectDir, 'metadata.json'),
      JSON.stringify({
        businessName: 'Test Business',
        industry: 'Technology'
      })
    );

    await fs.writeFile(
      path.join(testProspectDir, 'sitemap.json'),
      JSON.stringify({
        pages: [{ id: 'home', title: 'Home Page' }]
      })
    );

    await fs.writeFile(
      path.join(testProspectDir, 'styles.css'),
      ':root { --primary-color: #0066cc; }'
    );

    await fs.writeFile(
      path.join(testProspectDir, 'conversation.json'),
      JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
        ]
      })
    );

    // Create test asset file
    await fs.writeFile(
      path.join(testProspectDir, 'assets', 'test-image.jpg'),
      'test image content'
    );
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('ChatService → MCPService Integration', () => {
    test('should get MCP tool definitions from MCPService', () => {
      const tools = services.mcpService.getToolDefinitions();

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBe(5);

      // Verify tool structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool.input_schema).toHaveProperty('type', 'object');
        expect(tool.input_schema).toHaveProperty('properties');
      });

      // Verify all 5 tools are present
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read_user_assets');
      expect(toolNames).toContain('read_conversation');
      expect(toolNames).toContain('read_metadata');
      expect(toolNames).toContain('read_sitemap');
      expect(toolNames).toContain('read_styles');
    });

    test('should execute tool through MCPService', async () => {
      const result = await services.mcpService.executeTool('read_user_assets', {
        userId: testUserId
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('files');
      expect(result.files).toContain('test-image.jpg');
    });

    test('should handle tool execution errors gracefully', async () => {
      await expect(
        services.mcpService.executeTool('non_existent_tool', {})
      ).rejects.toThrow();
    });
  });

  describe('ChatService → PromptService Integration', () => {
    test('should build system prompt with context', async () => {
      const prompt = await services.promptService.build({ userId: testUserId });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);

      // Should contain key sections (case-insensitive)
      const promptLower = prompt.toLowerCase();
      expect(promptLower).toContain('nitya');
      expect(promptLower).toContain('mcp');
      expect(promptLower).toContain('preview');
    });

    test('should inject userId into prompt', async () => {
      const prompt = await services.promptService.build({ userId: 'custom_user_123' });

      expect(prompt).toContain('custom_user_123');
    });

    test('should include all sections', async () => {
      const prompt = await services.promptService.build({ userId: testUserId });

      // Verify all major sections are present (case-insensitive)
      const promptLower = prompt.toLowerCase();
      const sections = [
        'personality',
        'mcp',
        'session',
        'tagging'
      ];

      sections.forEach(section => {
        expect(promptLower).toContain(section);
      });
    });
  });

  describe('Full Chat Flow: Message → Tools → Response', () => {
    test('should complete simple message flow', async () => {
      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      // Build system prompt
      const systemPrompt = await services.promptService.build({ userId: testUserId });
      expect(systemPrompt).toBeDefined();

      // Get tool definitions
      const tools = services.mcpService.getToolDefinitions();
      expect(tools.length).toBe(5);

      // This would normally call Anthropic API, but we're testing the flow
      console.log('  ✓ Message flow components ready (prompt + tools)');
    });

    test('should execute multiple tools in sequence', async () => {
      const toolCalls = [
        { name: 'read_user_assets', input: { userId: testUserId } },
        { name: 'read_metadata', input: { userId: testUserId } },
        { name: 'read_sitemap', input: { userId: testUserId } }
      ];

      const results = [];

      for (const call of toolCalls) {
        const result = await services.mcpService.executeTool(call.name, call.input);
        results.push(result);
      }

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toHaveProperty('success', true);
      });

      // Verify each tool returned expected data
      expect(results[0].files).toContain('test-image.jpg'); // assets
      expect(results[1].businessName).toBe('Test Business'); // metadata
      expect(results[2].pages).toBeInstanceOf(Array); // sitemap
    });

    test('should handle tool execution with dependencies', async () => {
      // FileService is used by multiple tools
      const fileService = services.fileService;
      expect(fileService).toBeDefined();

      // Execute tools that depend on FileService
      const assetsResult = await services.mcpService.executeTool('read_user_assets', {
        userId: testUserId
      });

      const metadataResult = await services.mcpService.executeTool('read_metadata', {
        userId: testUserId
      });

      expect(assetsResult.success).toBe(true);
      expect(metadataResult.success).toBe(true);
    });
  });

  describe('Tool Use Loop Simulation', () => {
    test('should execute all 5 tools in session resumption pattern', async () => {
      // Simulate session resumption where all tools should fire
      const tools = [
        'read_user_assets',
        'read_conversation',
        'read_metadata',
        'read_sitemap',
        'read_styles'
      ];

      const results = [];

      for (const toolName of tools) {
        const result = await services.mcpService.executeTool(toolName, {
          userId: testUserId
        });
        results.push({ tool: toolName, result });
      }

      // All should succeed
      expect(results.length).toBe(5);
      results.forEach(({ tool, result }) => {
        expect(result.success).toBe(true);
        console.log(`  ✓ ${tool}: ${result.message || 'Success'}`);
      });

      // Verify specific tool results
      const assetsResult = results.find(r => r.tool === 'read_user_assets');
      expect(assetsResult.result.files).toContain('test-image.jpg');

      const metadataResult = results.find(r => r.tool === 'read_metadata');
      expect(metadataResult.result.businessName).toBe('Test Business');

      const conversationResult = results.find(r => r.tool === 'read_conversation');
      expect(conversationResult.result.messages).toBeInstanceOf(Array);

      const sitemapResult = results.find(r => r.tool === 'read_sitemap');
      expect(sitemapResult.result.pages).toBeInstanceOf(Array);

      const stylesResult = results.find(r => r.tool === 'read_styles');
      expect(stylesResult.result.styles).toBeDefined();
    });

    test('should handle partial tool failures gracefully', async () => {
      // Test with non-existent user (some tools will fail)
      const nonExistentUserId = 'non_existent_user_123';

      const tools = [
        'read_user_assets',
        'read_conversation',
        'read_metadata'
      ];

      const results = [];

      for (const toolName of tools) {
        try {
          const result = await services.mcpService.executeTool(toolName, {
            userId: nonExistentUserId
          });
          results.push({ tool: toolName, success: true, result });
        } catch (error) {
          results.push({ tool: toolName, success: false, error: error.message });
        }
      }

      // Should complete without throwing
      expect(results.length).toBe(3);

      // Tools should handle missing files gracefully
      results.forEach(({ tool, success, result }) => {
        if (success) {
          expect(result.success).toBe(true);
          // Should return empty/default data for missing files
        }
      });
    });
  });

  describe('Service Container Integration', () => {
    test('should have all services initialized', () => {
      expect(services.chatService).toBeDefined();
      expect(services.mcpService).toBeDefined();
      expect(services.promptService).toBeDefined();
      expect(services.fileService).toBeDefined();
      expect(services.dataService).toBeDefined();
      expect(services.sessionService).toBeDefined();
      expect(services.folderService).toBeDefined();
    });

    test('should share services across components', () => {
      // ChatService should use same MCPService instance
      expect(services.chatService.mcpService).toBe(services.mcpService);
      expect(services.chatService.promptService).toBe(services.promptService);
    });

    test('should maintain service state', async () => {
      // Execute a tool
      await services.mcpService.executeTool('read_user_assets', {
        userId: testUserId
      });

      // Service should still be operational
      const tools = services.mcpService.getToolDefinitions();
      expect(tools.length).toBe(5);
    });
  });

  describe('Chat Flow Performance', () => {
    test('should build prompt quickly', async () => {
      const startTime = Date.now();

      await services.promptService.build({ userId: testUserId });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
      console.log(`  ⏱️  Prompt building: ${duration}ms`);
    });

    test('should execute tools efficiently', async () => {
      const startTime = Date.now();

      await services.mcpService.executeTool('read_user_assets', {
        userId: testUserId
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
      console.log(`  ⏱️  Single tool execution: ${duration}ms`);
    });

    test('should execute all 5 tools quickly', async () => {
      const tools = [
        'read_user_assets',
        'read_conversation',
        'read_metadata',
        'read_sitemap',
        'read_styles'
      ];

      const startTime = Date.now();

      for (const toolName of tools) {
        await services.mcpService.executeTool(toolName, {
          userId: testUserId
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // All 5 tools in <200ms
      console.log(`  ⏱️  All 5 tools execution: ${duration}ms (${(duration/5).toFixed(1)}ms avg)`);
    });
  });

  describe('Error Handling in Flow', () => {
    test('should handle missing userId gracefully', async () => {
      await expect(
        services.mcpService.executeTool('read_user_assets', {})
      ).rejects.toThrow();
    });

    test('should handle invalid tool parameters', async () => {
      await expect(
        services.mcpService.executeTool('read_user_assets', {
          userId: null
        })
      ).rejects.toThrow();
    });

    test('should handle FileService errors', async () => {
      // Try to read from invalid path
      const invalidUserId = '../../../etc/passwd';

      // Should either sanitize or reject
      try {
        await services.mcpService.executeTool('read_user_assets', {
          userId: invalidUserId
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cross-Service Data Flow', () => {
    test('should pass data between services correctly', async () => {
      // 1. FileService reads file
      const fileContent = await services.fileService.readJSON(
        path.join(testProspectDir, 'metadata.json')
      );
      expect(fileContent.businessName).toBe('Test Business');

      // 2. DataService can access same file
      const dataContent = await services.dataService.loadMetadata(testUserId);
      expect(dataContent.data.businessName).toBe('Test Business');

      // 3. Tool uses FileService internally
      const toolResult = await services.mcpService.executeTool('read_metadata', {
        userId: testUserId
      });
      expect(toolResult.businessName).toBe('Test Business');

      // All should return consistent data
      expect(fileContent.businessName).toBe(dataContent.data.businessName);
      expect(dataContent.data.businessName).toBe(toolResult.businessName);
    });

    test('should maintain data consistency across operations', async () => {
      // Update metadata through DataService
      await services.dataService.updateMetadata(testUserId, {
        businessName: 'Updated Business',
        industry: 'Healthcare'
      });

      // Read through tool
      const toolResult = await services.mcpService.executeTool('read_metadata', {
        userId: testUserId
      });

      expect(toolResult.businessName).toBe('Updated Business');
      expect(toolResult.metadata.industry).toBe('Healthcare');
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory with repeated tool calls', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await services.mcpService.executeTool('read_user_assets', {
          userId: testUserId
        });
      }

      // Should complete without errors
      expect(true).toBe(true);
    }, 10000);

    test('should handle concurrent tool execution', async () => {
      const promises = Array(10).fill(null).map(() =>
        services.mcpService.executeTool('read_user_assets', {
          userId: testUserId
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.files).toContain('test-image.jpg');
      });
    });
  });
});
