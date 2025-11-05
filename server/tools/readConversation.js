const BaseTool = require('./BaseTool');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReadConversationTool - Reads the full conversation history
 * Used by NITYA when resuming a session to catch up on what's been discussed
 */
class ReadConversationTool extends BaseTool {
  constructor(dependencies = {}) {
    super(
      'read_conversation',
      'Reads the full conversation history from conversation.json. Use this when resuming a session to catch up on what\'s been discussed.',
      {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID whose conversation to read'
          }
        },
        required: ['userId']
      }
    );
  }

  /**
   * Read conversation.json and return message history
   * @param {Object} params - { userId: string }
   * @returns {Promise<Object>} - { success, messages, messageCount, lastUpdated }
   */
  async run(params) {
    const { userId } = params;
    const conversationPath = path.join(__dirname, '../../prospects', userId, 'conversation.json');

    try {
      const data = await fs.readFile(conversationPath, 'utf-8');
      const parsed = JSON.parse(data);

      return {
        success: true,
        messages: parsed.messages || [],
        messageCount: (parsed.messages || []).length,
        lastUpdated: parsed.updatedAt || 'unknown'
      };

    } catch (error) {
      // No conversation file = new session
      if (error.code === 'ENOENT') {
        return {
          success: true,
          messages: [],
          messageCount: 0,
          message: 'No conversation history yet (new session)'
        };
      }

      // Other errors
      throw error;
    }
  }
}

module.exports = ReadConversationTool;
