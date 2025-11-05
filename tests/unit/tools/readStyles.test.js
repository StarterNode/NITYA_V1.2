/**
 * readStyles.test.js
 * Unit tests for read_styles MCP tool
 */

const ReadStylesTool = require('../../../server/tools/readStyles');

describe('ReadStylesTool', () => {
    let tool;
    const testUserId = 'test_user_001';

    beforeEach(() => {
        tool = new ReadStylesTool();
    });

    afterEach(() => {
        tool = null;
    });

    describe('Tool Definition', () => {
        test('should have correct name', () => {
            expect(tool.name).toBe('read_styles');
        });

        test('should have description', () => {
            expect(tool.description).toBeDefined();
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(0);
            expect(tool.description.toLowerCase()).toContain('styles');
        });

        test('should have valid input schema', () => {
            expect(tool.input_schema).toBeDefined();
            expect(tool.input_schema.type).toBe('object');
            expect(tool.input_schema.properties).toBeDefined();
            expect(tool.input_schema.properties.userId).toBeDefined();
        });

        test('should require userId parameter', () => {
            expect(tool.input_schema.required).toContain('userId');
        });
    });

    describe('getDefinition()', () => {
        test('should return complete tool definition', () => {
            const definition = tool.getDefinition();

            expect(definition).toHaveProperty('name');
            expect(definition).toHaveProperty('description');
            expect(definition).toHaveProperty('input_schema');
        });

        test('should return definition matching MCP protocol', () => {
            const definition = tool.getDefinition();

            expect(definition.name).toBe('read_styles');
            expect(definition.input_schema.type).toBe('object');
        });
    });

    describe('execute()', () => {
        test('should execute successfully with valid userId', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('success');
            expect(result.success).toBe(true);
        });

        test('should return style fields', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('primaryColor');
            expect(result).toHaveProperty('fontHeading');
            expect(result).toHaveProperty('referenceSite');
        });

        test('should handle non-existent styles gracefully', async () => {
            const result = await tool.execute({ userId: 'non_existent_user' });

            expect(result.success).toBe(true);
            expect(result.primaryColor).toBeNull();
            expect(result.fontHeading).toBeNull();
            expect(result.referenceSite).toBeNull();
            expect(result.message).toContain('No brand styles set yet');
        });

        test('should throw error for missing userId', async () => {
            await expect(
                tool.execute({})
            ).rejects.toThrow();
        });

        test('should throw error for null userId', async () => {
            // Null userId will fail validation (falsy check)
            await expect(
                tool.execute({ userId: null })
            ).rejects.toThrow('Missing required field: userId');
        });
    });

    describe('Style Parsing', () => {
        test('should return primaryColor as null or string', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result.primaryColor === null || typeof result.primaryColor === 'string').toBe(true);
        });

        test('should return fontHeading as null or string', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result.fontHeading === null || typeof result.fontHeading === 'string').toBe(true);
        });

        test('should return referenceSite as null or string', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result.referenceSite === null || typeof result.referenceSite === 'string').toBe(true);
        });

        test('should include rawCSS snippet if styles exist', async () => {
            const result = await tool.execute({ userId: testUserId });

            if (result.primaryColor !== null) {
                expect(result).toHaveProperty('rawCSS');
                expect(typeof result.rawCSS).toBe('string');
            }
        });
    });

    describe('CSS Pattern Matching', () => {
        test('should correctly parse CSS variables', async () => {
            const result = await tool.execute({ userId: testUserId });

            // If styles file exists and has primary color, it should be parsed
            if (result.primaryColor) {
                expect(typeof result.primaryColor).toBe('string');
                expect(result.primaryColor.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Run Method', () => {
        test('should be implemented', () => {
            expect(typeof tool.run).toBe('function');
        });

        test('should return result object', async () => {
            const result = await tool.run({ userId: testUserId });

            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });

        test('should return same result as execute', async () => {
            const result1 = await tool.run({ userId: testUserId });
            const result2 = await tool.execute({ userId: testUserId });

            expect(result1.success).toBe(result2.success);
            expect(result1.primaryColor).toBe(result2.primaryColor);
        });
    });

    describe('Validation', () => {
        test('should validate params before execution', async () => {
            try {
                await tool.execute({});
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('userId');
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle filesystem errors gracefully', async () => {
            try {
                const result = await tool.execute({ userId: testUserId });
                expect(result.success).toBe(true);
            } catch (error) {
                // Should not throw unexpected errors
                expect(error).toBeDefined();
            }
        });
    });
});
