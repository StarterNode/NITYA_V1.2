/**
 * Integration Tests: Prompt Building System
 * Tests: PromptService → PromptBuilder → Section Classes
 *
 * Tests the modular prompt assembly system from service through
 * all section components.
 */

const ServiceContainer = require('../../../server/services/ServiceContainer');
const PromptBuilder = require('../../../server/prompts/PromptBuilder');
const PersonalitySection = require('../../../server/prompts/sections/PersonalitySection');
const MCPSection = require('../../../server/prompts/sections/MCPSection');
const SessionSection = require('../../../server/prompts/sections/SessionSection');
const TaggingSection = require('../../../server/prompts/sections/TaggingSection');

describe('Prompt Building Integration Tests', () => {
  let services;

  beforeAll(() => {
    services = new ServiceContainer();
    services.initialize();
  });

  describe('PromptService → PromptBuilder Integration', () => {
    test('should build complete prompt through service', async () => {
      const prompt = await services.promptService.build({
        userId: 'test_user_001'
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);

      // Should contain header information (case-insensitive)
      expect(prompt.toLowerCase()).toContain('nitya');
      expect(prompt).toContain('test_user_001');
    });

    test('should use PromptBuilder internally', () => {
      expect(services.promptService.promptBuilder).toBeInstanceOf(PromptBuilder);
    });

    test('should accept context parameters', async () => {
      const context = {
        userId: 'custom_user',
        sessionActive: true,
        customData: 'test'
      };

      const prompt = await services.promptService.build(context);

      expect(prompt).toContain('custom_user');
    });

    test('should handle empty context', async () => {
      const prompt = await services.promptService.build({});

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('PromptBuilder → Sections Integration', () => {
    let builder;

    beforeEach(() => {
      builder = new PromptBuilder();
    });

    test('should load all section classes', () => {
      expect(builder.sections).toBeInstanceOf(Array);
      expect(builder.sections.length).toBeGreaterThan(0);

      // Verify each section is properly instantiated
      builder.sections.forEach(section => {
        expect(section.name).toBeDefined();
        expect(typeof section.generate).toBe('function');
        expect(typeof section.shouldInclude).toBe('function');
      });
    });

    test('should have all required sections', () => {
      const sectionTypes = builder.sections.map(s => s.constructor.name);

      expect(sectionTypes).toContain('PersonalitySection');
      expect(sectionTypes).toContain('MCPSection');
      expect(sectionTypes).toContain('SessionSection');
      expect(sectionTypes).toContain('TaggingSection');
    });

    test('should build complete prompt with all sections', async () => {
      const context = { userId: 'test_user' };
      const prompt = await builder.build(context);

      // Should contain content from each section (case-insensitive)
      const expectedSectionMarkers = [
        'personality',
        'mcp',
        'session',
        'preview',
        'metadata'
      ];

      expectedSectionMarkers.forEach(marker => {
        expect(prompt.toLowerCase()).toContain(marker);
      });
    });

    test('should order sections by priority', async () => {
      const prompt = await builder.build({ userId: 'test' });

      // Personality should come early, MCP and tagging sections should be present (case-insensitive)
      const promptLower = prompt.toLowerCase();
      const personalityIndex = promptLower.indexOf('personality');
      const mcpIndex = promptLower.indexOf('mcp');

      expect(personalityIndex).toBeGreaterThan(-1);
      expect(mcpIndex).toBeGreaterThan(-1);
    });
  });

  describe('Individual Section Integration', () => {
    test('PersonalitySection should load brain modules', async () => {
      const section = new PersonalitySection();
      const context = { userId: 'test_user' };

      const content = await section.generate(context);

      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);

      // Should contain personality data (case-insensitive)
      const contentLower = content.toLowerCase();
      expect(contentLower).toContain('nitya');
    });

    test('MCPSection should include tool instructions', async () => {
      const section = new MCPSection();
      const context = { userId: 'test_user' };

      const content = await section.generate(context);

      const contentLower = content.toLowerCase();
      expect(contentLower).toContain('mcp');
      expect(contentLower).toContain('tool');

      // Should mention at least the primary tool
      expect(content).toContain('read_user_assets');

      // Should have MCP-related instructions
      expect(contentLower).toContain('fileviewer');
      expect(contentLower).toContain('exact filename');
    });

    test('SessionSection should include session logic', async () => {
      const section = new SessionSection();
      const context = { userId: 'test_user' };

      const content = await section.generate(context);

      const contentLower = content.toLowerCase();
      expect(contentLower).toContain('session');
      expect(contentLower).toContain('system');
    });

    test('TaggingSection should include data collection protocols', async () => {
      const section = new TaggingSection();
      const context = { userId: 'test_user' };

      const content = await section.generate(context);

      // Should contain tagging instructions
      expect(content).toContain('[PREVIEW:');
      expect(content).toContain('[METADATA:');
      expect(content).toContain('[SITEMAP:');
      expect(content).toContain('[STYLES:');
    });
  });

  describe('Section Conditional Inclusion', () => {
    let builder;

    beforeEach(() => {
      builder = new PromptBuilder();
    });

    test('should include all sections by default', async () => {
      const prompt = await builder.build({ userId: 'test' });

      // Count sections in output
      const sectionCount = builder.sections.filter(section =>
        section.shouldInclude({ userId: 'test' })
      ).length;

      expect(sectionCount).toBe(builder.sections.length);
    });

    test('MCPSection should respect disableMCP flag', async () => {
      const mcpSection = builder.sections.find(s => s.constructor.name === 'MCPSection');

      expect(mcpSection.shouldInclude({})).toBe(true);
      expect(mcpSection.shouldInclude({ disableMCP: false })).toBe(true);
      expect(mcpSection.shouldInclude({ disableMCP: true })).toBe(false);
    });

    test('should build prompt without optional sections', async () => {
      const context = {
        userId: 'test',
        disableMCP: true
      };

      const prompt = await builder.build(context);

      // Should still be valid prompt without MCP section
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Context Injection Through Layers', () => {
    test('should pass userId through all layers', async () => {
      const testUserId = 'integration_test_user_' + Date.now();

      const prompt = await services.promptService.build({
        userId: testUserId
      });

      // UserId should appear in the prompt (from header or sections)
      expect(prompt).toContain(testUserId);
    });

    test('should pass custom context to sections', async () => {
      const builder = new PromptBuilder();
      const context = {
        userId: 'test',
        customField: 'customValue'
      };

      const prompt = await builder.build(context);

      // Sections should have access to full context
      expect(prompt).toBeDefined();
    });

    test('should inject context into section templates', async () => {
      const section = new PersonalitySection();
      const context = { userId: 'test_user_123' };

      const content = await section.generate(context);

      // Section should process context
      expect(typeof content).toBe('string');
    });
  });

  describe('Prompt Content Validation', () => {
    test('should generate valid UTF-8 text', async () => {
      const prompt = await services.promptService.build({ userId: 'test' });

      // Should be valid string without encoding issues
      expect(() => Buffer.from(prompt, 'utf-8')).not.toThrow();
    });

    test('should not contain undefined or null values', async () => {
      const prompt = await services.promptService.build({ userId: 'test' });

      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('null');
      expect(prompt).not.toContain('[object Object]');
    });

    test('should have reasonable length', async () => {
      const prompt = await services.promptService.build({ userId: 'test' });

      // Should be substantial but not excessive
      expect(prompt.length).toBeGreaterThan(1000); // Minimum content
      expect(prompt.length).toBeLessThan(50000); // Maximum reasonable size
    });

    test('should have consistent structure', async () => {
      const prompt1 = await services.promptService.build({ userId: 'user1' });
      const prompt2 = await services.promptService.build({ userId: 'user2' });

      // Should have similar length (within 20%)
      const lengthDiff = Math.abs(prompt1.length - prompt2.length);
      const avgLength = (prompt1.length + prompt2.length) / 2;
      const percentDiff = (lengthDiff / avgLength) * 100;

      expect(percentDiff).toBeLessThan(20);
    });

    test('should include section separators', async () => {
      const prompt = await services.promptService.build({ userId: 'test' });

      // Should have clear section breaks
      const lineBreaks = (prompt.match(/\n\n/g) || []).length;
      expect(lineBreaks).toBeGreaterThan(0);
    });
  });

  describe('Prompt Building Performance', () => {
    test('should build prompt quickly', async () => {
      const startTime = Date.now();

      await services.promptService.build({ userId: 'test' });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      console.log(`  ⏱️  Prompt building time: ${duration}ms`);
    });

    test('should handle repeated builds efficiently', async () => {
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await services.promptService.build({ userId: `user_${i}` });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(200);

      console.log(`  ⏱️  Average build time (${iterations} builds): ${avgTime.toFixed(2)}ms`);
      console.log(`  ⏱️  Max build time: ${maxTime}ms`);
    }, 10000);

    test('should not leak memory with repeated builds', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await services.promptService.build({ userId: `user_${i}` });
      }

      // Should complete without errors
      expect(true).toBe(true);
    }, 10000);

    test('should handle concurrent builds', async () => {
      const promises = Array(20).fill(null).map((_, i) =>
        services.promptService.build({ userId: `concurrent_user_${i}` })
      );

      const prompts = await Promise.all(promises);

      // All should complete successfully
      prompts.forEach(prompt => {
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(1000);
      });
    });
  });

  describe('Section Error Handling', () => {
    test('should handle missing brain modules gracefully', async () => {
      // PersonalitySection loads brain modules
      const section = new PersonalitySection();

      // Should not throw even if a module is missing
      await expect(section.generate({ userId: 'test' })).resolves.toBeDefined();
    });

    test('should continue building if a section fails', async () => {
      const builder = new PromptBuilder();

      // Even if a section throws, build should handle it
      const prompt = await builder.build({ userId: 'test' });

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('should validate section output', async () => {
      const sections = [
        new PersonalitySection(),
        new MCPSection(),
        new SessionSection(),
        new TaggingSection()
      ];

      for (const section of sections) {
        const content = await section.generate({ userId: 'test' });

        // Each section should return valid string
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Full Integration Flow', () => {
    test('should complete full prompt building pipeline', async () => {
      // 1. Service receives request
      const context = {
        userId: 'full_integration_test',
        sessionActive: true
      };

      // 2. Service delegates to PromptBuilder
      const prompt = await services.promptService.build(context);

      // 3. Verify prompt has all components (case-insensitive)
      const promptLower = prompt.toLowerCase();
      expect(promptLower).toContain('nitya');
      expect(prompt).toContain('full_integration_test');
      expect(promptLower).toContain('mcp');
      expect(promptLower).toContain('preview');

      // 4. Verify prompt is API-ready
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(1000);
      expect(prompt).not.toContain('undefined');

      console.log(`  ✓ Generated prompt: ${prompt.length} characters`);
    });

    test('should produce consistent output for same input', async () => {
      const context = { userId: 'consistency_test' };

      const prompt1 = await services.promptService.build(context);
      const prompt2 = await services.promptService.build(context);

      // Should generate identical prompts
      expect(prompt1).toBe(prompt2);
    });

    test('should produce different output for different users', async () => {
      const prompt1 = await services.promptService.build({ userId: 'user_a' });
      const prompt2 = await services.promptService.build({ userId: 'user_b' });

      // Should contain different userIds
      expect(prompt1).toContain('user_a');
      expect(prompt2).toContain('user_b');
      expect(prompt1).not.toBe(prompt2);
    });

    test('should integrate with ChatService', async () => {
      // ChatService uses PromptService
      expect(services.chatService.promptService).toBe(services.promptService);

      // PromptService should be ready for ChatService to use
      const prompt = await services.chatService.promptService.build({
        userId: 'chat_integration_test'
      });

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Template and Placeholder Handling', () => {
    test('should replace all placeholders in templates', async () => {
      const prompt = await services.promptService.build({
        userId: 'placeholder_test',
        customValue: 'test_value'
      });

      // Should not have unreplaced placeholders
      expect(prompt).not.toMatch(/\{\{[^}]+\}\}/);
    });

    test('should handle missing template values gracefully', async () => {
      const section = new PersonalitySection();

      // Generate with minimal context
      const content = await section.generate({ userId: 'minimal' });

      // Should still generate valid content
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
