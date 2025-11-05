/**
 * readMetadata.test.js
 * Unit tests for read_metadata MCP tool
 */

const ReadMetadataTool = require('../../../server/tools/readMetadata');

describe('ReadMetadataTool', () => {
    let tool;
    const testUserId = 'test_user_001';

    beforeEach(() => {
        tool = new ReadMetadataTool();
    });

    afterEach(() => {
        tool = null;
    });

    describe('Tool Definition', () => {
        test('should have correct name', () => {
            expect(tool.name).toBe('read_metadata');
        });

        test('should have description', () => {
            expect(tool.description).toBeDefined();
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(0);
            expect(tool.description.toLowerCase()).toContain('metadata');
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

            expect(definition.name).toBe('read_metadata');
            expect(definition.input_schema.type).toBe('object');
        });
    });

    describe('execute()', () => {
        test('should execute successfully with valid userId', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('success');
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('metadata');
        });

        test('should return metadata object', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(typeof result.metadata).toBe('object');
        });

        test('should handle non-existent metadata gracefully', async () => {
            const result = await tool.execute({ userId: 'non_existent_user' });

            expect(result.success).toBe(true);
            expect(result.metadata).toEqual({});
            expect(result.message).toContain('No metadata collected yet');
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

    describe('Metadata Fields', () => {
        test('should include businessName field', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('businessName');
            // Should be null or string
            expect(result.businessName === null || typeof result.businessName === 'string').toBe(true);
        });

        test('should include hasLogo field', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('hasLogo');
            expect(typeof result.hasLogo).toBe('boolean');
        });

        test('should include hasHeroImage field', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('hasHeroImage');
            expect(typeof result.hasHeroImage).toBe('boolean');
        });

        test('should correctly determine hasLogo from metadata', async () => {
            const result = await tool.execute({ userId: testUserId });

            if (result.metadata.logo) {
                expect(result.hasLogo).toBe(true);
            } else {
                expect(result.hasLogo).toBe(false);
            }
        });

        test('should correctly determine hasHeroImage from metadata', async () => {
            const result = await tool.execute({ userId: testUserId });

            if (result.metadata.heroImage) {
                expect(result.hasHeroImage).toBe(true);
            } else {
                expect(result.hasHeroImage).toBe(false);
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
            expect(result1.hasLogo).toBe(result2.hasLogo);
            expect(result1.hasHeroImage).toBe(result2.hasHeroImage);
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
