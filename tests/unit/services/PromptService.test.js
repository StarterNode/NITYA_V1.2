/**
 * PromptService.test.js
 * Unit tests for Prompt building and management service
 */

const PromptService = require('../../../server/services/PromptService');

describe('PromptService', () => {
    let promptService;

    beforeEach(() => {
        promptService = new PromptService();
    });

    afterEach(() => {
        promptService = null;
    });

    describe('Initialization', () => {
        test('should initialize with PromptBuilder', () => {
            expect(promptService.promptBuilder).toBeDefined();
        });

        test('should extend BaseService', () => {
            expect(promptService.logger).toBeDefined();
            expect(promptService.config).toBeDefined();
        });
    });

    describe('build()', () => {
        test('should build system prompt successfully', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        test('should include NITYA personality in prompt', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            // Check for personality-related content (case-insensitive)
            expect(prompt.toLowerCase()).toContain('nitya');
        });

        test('should include MCP tool instructions', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            // Check for MCP-related content
            expect(prompt.toLowerCase()).toContain('mcp');
            expect(prompt).toContain('read_user_assets');
        });

        test('should include tagging protocols', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            // Check for tagging instruction patterns
            expect(prompt).toContain('METADATA');
            expect(prompt).toContain('PREVIEW');
        });

        test('should handle context injection', async () => {
            const context = {
                userId: 'test_user_001',
                customData: 'test_value'
            };

            const prompt = await promptService.build(context);

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        test('should build different prompts for different contexts', async () => {
            const prompt1 = await promptService.build({ userId: 'user_001' });
            const prompt2 = await promptService.build({ userId: 'user_002' });

            // Both should be valid prompts
            expect(prompt1.length).toBeGreaterThan(0);
            expect(prompt2.length).toBeGreaterThan(0);

            // They should have different user IDs
            expect(prompt1).toContain('user_001');
            expect(prompt2).toContain('user_002');
        });
    });

    describe('Prompt Structure', () => {
        test('should have clear section structure', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            // Should have section markers (##)
            expect(prompt).toMatch(/##/);
        });

        test('should be properly formatted', async () => {
            const prompt = await promptService.build({ userId: 'test_user_001' });

            // Should not have excessive blank lines
            expect(prompt).not.toMatch(/\n{5,}/);

            // Should have newlines for readability
            expect(prompt).toContain('\n\n');
        });
    });

    describe('Error Handling', () => {
        test('should handle empty context', async () => {
            const prompt = await promptService.build({});

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        test('should handle null context', async () => {
            const prompt = await promptService.build();

            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        test('should build prompt in reasonable time', async () => {
            const startTime = Date.now();

            await promptService.build({ userId: 'test_user_001' });

            const duration = Date.now() - startTime;

            // Should complete in less than 1 second
            expect(duration).toBeLessThan(1000);
        });

        test('should handle multiple builds efficiently', async () => {
            const startTime = Date.now();

            // Build 10 prompts
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    promptService.build({ userId: `test_user_${i}` })
                );
            }

            await Promise.all(promises);

            const duration = Date.now() - startTime;

            // Should complete all 10 in less than 5 seconds
            expect(duration).toBeLessThan(5000);
        });
    });
});
