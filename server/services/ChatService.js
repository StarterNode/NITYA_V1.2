const BaseService = require('./BaseService');
const fetch = require('node-fetch');

/**
 * ChatService - Anthropic API Communication Service
 * Handles all interactions with Claude API including tool use loops
 */
class ChatService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.mcpService = dependencies.mcpService;
    this.promptService = dependencies.promptService;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.mcpService) {
      throw new Error('ChatService requires mcpService dependency');
    }
    if (!this.config) {
      throw new Error('ChatService requires config dependency');
    }
  }

  /**
   * Process a chat message through Claude with MCP tools
   * @param {Object} params - { messages: Array, userId: string }
   * @returns {Promise<Object>} - Claude's response
   */
  async processMessage(params) {
    const { messages, userId } = params;

    console.log(`💬 ChatService: Processing message with ${messages.length} messages`);

    // Build system prompt using PromptService
    let systemPrompt;
    if (this.promptService) {
      systemPrompt = await this.promptService.build({ userId: userId || 'test_user_001' });
    } else {
      throw new Error('PromptService required but not provided');
    }

    // Get MCP tools from service
    const tools = this.mcpService.getToolDefinitions();

    // Initial API call
    let response = await this.callAnthropic({
      messages,
      systemPrompt,
      tools
    });

    // Handle tool use loop if needed
    if (response.stop_reason === 'tool_use') {
      response = await this.handleToolUseLoop(response, messages, systemPrompt, tools);
    }

    console.log(`✅ ChatService: Message processed successfully`);
    return response;
  }

  /**
   * Make a call to Anthropic's Claude API
   * @param {Object} params - { messages, systemPrompt, tools }
   * @returns {Promise<Object>} - API response
   */
  async callAnthropic(params) {
    const { messages, systemPrompt, tools } = params;

    console.log(`🤖 ChatService: Calling Anthropic API (${this.config.MODEL})`);

    const response = await fetch(this.config.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.ANTHROPIC_API_KEY,
        'anthropic-version': this.config.API_VERSION
      },
      body: JSON.stringify({
        model: this.config.MODEL,
        max_tokens: this.config.MAX_TOKENS,
        temperature: 1.0,
        tools: tools,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Handle the tool use loop when Claude wants to use MCP tools
   * @param {Object} initialResponse - Initial response with tool_use
   * @param {Array} messages - Message history (will be mutated)
   * @param {string} systemPrompt - System prompt for subsequent calls
   * @param {Array} tools - Tool definitions
   * @returns {Promise<Object>} - Final response after tool loop completes
   */
  async handleToolUseLoop(initialResponse, messages, systemPrompt, tools) {
    let data = initialResponse;
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (data.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      console.log(`🔄 ChatService: Tool use loop iteration ${iterations}`);

      // Find all tool use blocks in the response
      const toolUseBlocks = data.content.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        console.warn('⚠️ ChatService: No tool use blocks found despite stop_reason=tool_use');
        break;
      }

      // Add Claude's response (including tool_use blocks) to messages
      messages.push({
        role: 'assistant',
        content: data.content
      });

      // Execute all tool calls using MCPService
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        try {
          const toolResult = await this.mcpService.executeTool(toolUse.name, toolUse.input);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          });
        } catch (error) {
          console.error(`❌ ChatService: Tool execution failed for ${toolUse.name}:`, error);

          // Add error result so conversation can continue
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: false,
              error: error.message
            }),
            is_error: true
          });
        }
      }

      // Add tool results as user message
      messages.push({
        role: 'user',
        content: toolResults
      });

      // Continue conversation with tool results
      data = await this.callAnthropic({
        messages,
        systemPrompt,
        tools
      });
    }

    if (iterations >= maxIterations) {
      console.warn('⚠️ ChatService: Max tool use iterations reached');
    } else {
      console.log(`✅ ChatService: Tool use loop completed (${iterations} iteration${iterations !== 1 ? 's' : ''})`);
    }

    return data;
  }

  /**
   * Get available MCP tools
   * @returns {Array} - Tool definitions
   */
  getTools() {
    return this.mcpService.getToolDefinitions();
  }

  /**
   * Validate message format
   * @param {Array} messages - Messages to validate
   * @throws {Error} - If validation fails
   */
  validateMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    if (messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }

      if (!['user', 'assistant'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }
  }
}

module.exports = ChatService;
