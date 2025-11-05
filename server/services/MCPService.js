const BaseService = require('./BaseService');

/**
 * MCPService - MCP Tool Orchestration Service
 * Manages tool registration, retrieval, and execution
 */
class MCPService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.tools = new Map();
    this.initializeTools();
  }

  /**
   * Initialize all MCP tools
   * Dynamically loads all tool classes and registers them
   */
  initializeTools() {
    const ReadAssetsTool = require('../tools/readAssets');
    const ReadConversationTool = require('../tools/readConversation');
    const ReadMetadataTool = require('../tools/readMetadata');
    const ReadSitemapTool = require('../tools/readSitemap');
    const ReadStylesTool = require('../tools/readStyles');

    const toolClasses = [
      ReadAssetsTool,
      ReadConversationTool,
      ReadMetadataTool,
      ReadSitemapTool,
      ReadStylesTool
    ];

    toolClasses.forEach(ToolClass => {
      const tool = new ToolClass();
      this.tools.set(tool.name, tool);
      console.log(`🔧 Registered MCP tool: ${tool.name}`);
    });

    console.log(`✅ ${this.tools.size} MCP tools registered`);
  }

  /**
   * Get all tool definitions for Anthropic API
   * @returns {Array} - Array of tool definitions
   */
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  /**
   * Execute a tool by name
   * @param {string} toolName - The tool to execute
   * @param {Object} params - Tool parameters
   * @returns {Promise<Object>} - Tool execution result
   */
  async executeTool(toolName, params) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    console.log(`🔧 MCP Tool Called: ${toolName}`, params);
    const result = await tool.execute(params);
    console.log(`📂 MCP Tool Result:`, result);

    return result;
  }

  /**
   * Execute multiple tools in sequence
   * @param {Array} toolCalls - Array of { name, input } objects
   * @returns {Promise<Array>} - Array of tool results formatted for Anthropic API
   */
  async executeToolBatch(toolCalls) {
    const results = [];

    for (const call of toolCalls) {
      const result = await this.executeTool(call.name, call.input);

      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(result)
      });
    }

    return results;
  }

  /**
   * Get a specific tool by name
   * @param {string} toolName - Tool name
   * @returns {Object|null} - Tool instance or null
   */
  getTool(toolName) {
    return this.tools.get(toolName) || null;
  }

  /**
   * Get all registered tool names
   * @returns {Array<string>} - Array of tool names
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }
}

module.exports = MCPService;
