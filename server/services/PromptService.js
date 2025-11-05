const BaseService = require('./BaseService');
const PromptBuilder = require('../prompts/PromptBuilder');

/**
 * PromptService - Service wrapper for PromptBuilder
 * Provides a service interface for system prompt generation
 */
class PromptService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Build a system prompt with context
   * @param {Object} context - Build context (userId, sessionType, etc.)
   * @returns {Promise<string>} - Complete system prompt
   */
  async build(context = {}) {
    console.log(`📝 PromptService: Building prompt for context:`, context);

    try {
      const prompt = await this.promptBuilder.build(context);
      console.log(`✅ PromptService: Prompt built successfully (${prompt.length} characters)`);
      return prompt;
    } catch (error) {
      console.error(`❌ PromptService: Failed to build prompt:`, error);
      throw error;
    }
  }

  /**
   * Get available sections
   * @returns {Array<string>} - Section names
   */
  getSectionNames() {
    return this.promptBuilder.getSectionNames();
  }

  /**
   * Get a specific section
   * @param {string} name - Section name
   * @returns {Object|null} - Section instance
   */
  getSection(name) {
    return this.promptBuilder.getSection(name);
  }
}

module.exports = PromptService;
