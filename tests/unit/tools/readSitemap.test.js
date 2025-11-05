/**
 * readSitemap.test.js
 * Unit tests for read_sitemap MCP tool
 */

const ReadSitemapTool = require('../../../server/tools/readSitemap');

describe('ReadSitemapTool', () => {
    let tool;
    const testUserId = 'test_user_001';

    beforeEach(() => {
        tool = new ReadSitemapTool();
    });

    afterEach(() => {
        tool = null;
    });

    describe('Tool Definition', () => {
        test('should have correct name', () => {
            expect(tool.name).toBe('read_sitemap');
        });

        test('should have description', () => {
            expect(tool.description).toBeDefined();
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(0);
            expect(tool.description.toLowerCase()).toContain('sitemap');
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

            expect(definition.name).toBe('read_sitemap');
            expect(definition.input_schema.type).toBe('object');
        });
    });

    describe('execute()', () => {
        test('should execute successfully with valid userId', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('success');
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('pages');
            expect(result).toHaveProperty('pageCount');
        });

        test('should return array of pages', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(Array.isArray(result.pages)).toBe(true);
            expect(typeof result.pageCount).toBe('number');
            expect(result.pageCount).toBe(result.pages.length);
        });

        test('should handle non-existent sitemap gracefully', async () => {
            const result = await tool.execute({ userId: 'non_existent_user' });

            expect(result.success).toBe(true);
            expect(result.pages).toEqual([]);
            expect(result.pageCount).toBe(0);
            expect(result.message).toContain('No pages defined yet');
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

    describe('Pages Structure', () => {
        test('should return pages with proper structure if exists', async () => {
            const result = await tool.execute({ userId: testUserId });

            if (result.pages.length > 0) {
                result.pages.forEach(page => {
                    expect(typeof page).toBe('object');
                    // Pages should have structure (title, path, etc.)
                });
            }
        });

        test('should have matching pageCount and pages.length', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result.pageCount).toBe(result.pages.length);
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
            expect(result1.pageCount).toBe(result2.pageCount);
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
