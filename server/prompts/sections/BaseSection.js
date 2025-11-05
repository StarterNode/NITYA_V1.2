/**
 * BaseSection - Abstract base class for prompt sections
 * Each section represents a part of the system prompt
 */
class BaseSection {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority; // Higher priority = included first
  }

  /**
   * Determine if this section should be included in the prompt
   * @param {Object} context - Build context (userId, sessionType, etc.)
   * @returns {boolean} - Whether to include this section
   */
  shouldInclude(context) {
    return true; // Override in subclasses if conditional
  }

  /**
   * Generate the section content
   * @param {Object} context - Build context
   * @returns {Promise<string>} - Section content
   */
  async generate(context) {
    const template = await this.getTemplate(context);
    return this.populate(template, context);
  }

  /**
   * Get the template for this section
   * Must be implemented by subclasses
   * @param {Object} context - Build context
   * @returns {Promise<string>} - Template string
   */
  async getTemplate(context) {
    throw new Error(`${this.constructor.name} must implement getTemplate()`);
  }

  /**
   * Populate template with context values
   * Replaces {{variable}} with context values
   * @param {string} template - Template string
   * @param {Object} context - Context values
   * @returns {string} - Populated template
   */
  populate(template, context) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  }

  /**
   * Load a JSON file from brain_modules
   * @param {string} filename - Brain module filename
   * @returns {Promise<Object>} - Parsed JSON content
   */
  async loadBrainModule(filename) {
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(__dirname, '../../../brain_modules', filename);
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }
}

module.exports = BaseSection;
