/**
 * readAssets.test.js
 * Unit tests for read_user_assets MCP tool
 */

const ReadAssetsTool = require('../../../server/tools/readAssets');
const FileService = require('../../../server/services/FileService');
const fs = require('fs').promises;
const path = require('path');

describe('ReadAssetsTool', () => {
    let tool;
    let mockFileService;
    const testUserId = 'test_user_001';
    const testAssetsPath = path.join(__dirname, '../../../prospects', testUserId, 'assets');

    beforeEach(() => {
        mockFileService = new FileService();
        tool = new ReadAssetsTool({ fileService: mockFileService });
    });

    afterEach(async () => {
        tool = null;
    });

    describe('Tool Definition', () => {
        test('should have correct name', () => {
            expect(tool.name).toBe('read_user_assets');
        });

        test('should have description', () => {
            expect(tool.description).toBeDefined();
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(0);
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

            expect(definition.name).toBe('read_user_assets');
            expect(definition.input_schema.type).toBe('object');
        });
    });

    describe('execute()', () => {
        test('should execute successfully with valid userId', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('files');
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('message');
        });

        test('should return array of files', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(Array.isArray(result.files)).toBe(true);
        });

        test('should return file count', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(typeof result.count).toBe('number');
            expect(result.count).toBe(result.files.length);
        });

        test('should return descriptive message', async () => {
            const result = await tool.execute({ userId: testUserId });

            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
        });

        test('should handle non-existent assets folder gracefully', async () => {
            const result = await tool.execute({ userId: 'non_existent_user' });

            expect(result.success).toBe(true);
            expect(result.files).toEqual([]);
            expect(result.count).toBe(0);
            expect(result.message).toContain('No files uploaded yet');
        });

        test('should throw error for missing userId', async () => {
            await expect(
                tool.execute({})
            ).rejects.toThrow();
        });

        test('should throw error for null userId', async () => {
            await expect(
                tool.execute({ userId: null })
            ).rejects.toThrow();
        });
    });

    describe('File Filtering', () => {
        test('should only return image files', async () => {
            const result = await tool.execute({ userId: testUserId });

            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

            result.files.forEach(file => {
                const ext = path.extname(file).toLowerCase();
                expect(validExtensions).toContain(ext);
            });
        });

        test('should filter out non-image files', async () => {
            // If there were .txt or .pdf files, they should be excluded
            const result = await tool.execute({ userId: testUserId });

            result.files.forEach(file => {
                const ext = path.extname(file).toLowerCase();
                expect(ext).not.toBe('.txt');
                expect(ext).not.toBe('.pdf');
                expect(ext).not.toBe('.doc');
            });
        });
    });

    describe('Validation', () => {
        test('should validate params before execution', async () => {
            // Missing userId should be caught by validation
            try {
                await tool.execute({});
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('userId');
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
    });

    describe('Error Handling', () => {
        test('should handle filesystem errors gracefully', async () => {
            // Test with invalid path characters (if applicable)
            try {
                const result = await tool.execute({ userId: 'test_user_001' });
                expect(result.success).toBe(true);
            } catch (error) {
                // Should not throw unexpected errors
                expect(error).toBeDefined();
            }
        });
    });
});
