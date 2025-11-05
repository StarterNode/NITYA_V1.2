/**
 * BaseTool - Abstract base class for all MCP tools
 * Provides tool definition structure and validation
 */
class BaseTool {
  constructor(name, description, schema) {
    this.name = name;
    this.description = description;
    this.input_schema = schema;
  }

  /**
   * Get the MCP tool definition
   * @returns {Object} - Tool definition for Anthropic API
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.input_schema
    };
  }

  /**
   * Execute the tool with validation
   * @param {Object} params - Tool parameters
   * @returns {Promise<Object>} - Tool execution result
   */
  async execute(params) {
    this.validate(params);
    return await this.run(params);
  }

  /**
   * Validate tool parameters against schema
   * @param {Object} params - Parameters to validate
   * @throws {Error} - If validation fails
   */
  validate(params) {
    const required = this.input_schema.required || [];
    for (const field of required) {
      if (!params[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Run the tool - Must be implemented by subclasses
   * @param {Object} params - Tool parameters
   * @returns {Promise<Object>} - Tool result
   */
  async run(params) {
    throw new Error('Must implement run method');
  }
}

module.exports = BaseTool;
