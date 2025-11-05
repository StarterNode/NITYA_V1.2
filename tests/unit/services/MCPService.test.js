/**
 * MCPService.test.js
 * Unit tests for MCP tool orchestration service
 */

const MCPService = require('../../../server/services/MCPService');
const FileService = require('../../../server/services/FileService');

describe('MCPService', () => {
    let mcpService;
    let mockFileService;

    beforeEach(() => {
        // Create mock FileService
        mockFileService = new FileService();

        // Initialize MCPService
        mcpService = new MCPService({ fileService: mockFileService });
    });

    afterEach(() => {
        // Cleanup
        mcpService = null;
    });

    describe('Initialization', () => {
        test('should initialize with tools map', () => {
            expect(mcpService.tools).toBeDefined();
            expect(mcpService.tools instanceof Map).toBe(true);
        });

        test('should register 5 MCP tools', () => {
            const tools = mcpService.getToolDefinitions();
            expect(tools).toHaveLength(5);
        });

        test('should register all expected tools', () => {
            const tools = mcpService.getToolDefinitions();
            const toolNames = tools.map(t => t.name);

            expect(toolNames).toContain('read_user_assets');
            expect(toolNames).toContain('read_conversation');
            expect(toolNames).toContain('read_metadata');
            expect(toolNames).toContain('read_sitemap');
            expect(toolNames).toContain('read_styles');
        });
    });

    describe('getToolDefinitions()', () => {
        test('should return array of tool definitions', () => {
            const definitions = mcpService.getToolDefinitions();

            expect(Array.isArray(definitions)).toBe(true);
            expect(definitions.length).toBeGreaterThan(0);
        });

        test('each tool should have required properties', () => {
            const definitions = mcpService.getToolDefinitions();

            definitions.forEach(tool => {
                expect(tool).toHaveProperty('name');
                expect(tool).toHaveProperty('description');
                expect(tool).toHaveProperty('input_schema');
                expect(typeof tool.name).toBe('string');
                expect(typeof tool.description).toBe('string');
                expect(typeof tool.input_schema).toBe('object');
            });
        });

        test('each tool input_schema should have type and properties', () => {
            const definitions = mcpService.getToolDefinitions();

            definitions.forEach(tool => {
                expect(tool.input_schema).toHaveProperty('type');
                expect(tool.input_schema).toHaveProperty('properties');
                expect(tool.input_schema.type).toBe('object');
            });
        });
    });

    describe('executeTool()', () => {
        test('should execute read_user_assets tool successfully', async () => {
            const result = await mcpService.executeTool('read_user_assets', {
                userId: 'test_user_001'
            });

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('files');
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('message');
            expect(Array.isArray(result.files)).toBe(true);
        });

        test('should execute read_conversation tool successfully', async () => {
            const result = await mcpService.executeTool('read_conversation', {
                userId: 'test_user_001'
            });

            expect(result).toHaveProperty('success');
        });

        test('should throw error for unknown tool', async () => {
            await expect(
                mcpService.executeTool('unknown_tool', {})
            ).rejects.toThrow('Unknown tool: unknown_tool');
        });

        test('should throw error for missing required params', async () => {
            await expect(
                mcpService.executeTool('read_user_assets', {})
            ).rejects.toThrow();
        });
    });

    describe('Tool Registry', () => {
        test('should have tools map with correct size', () => {
            expect(mcpService.tools.size).toBe(5);
        });

        test('should be able to get tool by name', () => {
            const tool = mcpService.tools.get('read_user_assets');
            expect(tool).toBeDefined();
            expect(tool.name).toBe('read_user_assets');
        });

        test('should return undefined for non-existent tool', () => {
            const tool = mcpService.tools.get('non_existent_tool');
            expect(tool).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle tool execution errors gracefully', async () => {
            // Try to execute tool with invalid params
            try {
                await mcpService.executeTool('read_user_assets', { userId: null });
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('should log tool execution', async () => {
            const consoleSpy = jest.spyOn(console, 'log');

            await mcpService.executeTool('read_user_assets', {
                userId: 'test_user_001'
            });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
