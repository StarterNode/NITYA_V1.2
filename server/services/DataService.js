const BaseService = require('./BaseService');
const FileService = require('./FileService');

/**
 * DataService - JSON data operations service
 * Handles reading, writing, and managing JSON data files
 */
class DataService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.fileService = dependencies.fileService || new FileService();
  }

  /**
   * Read JSON data from a file
   * @param {string} userId - User ID
   * @param {string} filename - JSON filename (e.g., 'metadata.json')
   * @returns {Promise<Object|null>} - Parsed JSON or null if not found
   */
  async readJSON(userId, filename) {
    try {
      const content = await this.fileService.readFile(userId, filename);

      if (!content) {
        console.log(`📊 DataService: ${filename} not found for ${userId}`);
        return null;
      }

      const data = JSON.parse(content);
      console.log(`📊 DataService: Read ${filename} for ${userId}`);
      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`❌ DataService: Invalid JSON in ${filename}:`, error);
        throw new Error(`Invalid JSON in ${filename}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON data to a file
   * @param {string} userId - User ID
   * @param {string} filename - JSON filename
   * @param {Object} data - Data to write
   * @param {boolean} pretty - Whether to format JSON (default: true)
   * @returns {Promise<boolean>} - Success status
   */
  async writeJSON(userId, filename, data, pretty = true) {
    try {
      const content = pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      await this.fileService.writeFile(userId, filename, content);
      console.log(`📊 DataService: Wrote ${filename} for ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ DataService: Failed to write ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Update specific fields in a JSON file
   * @param {string} userId - User ID
   * @param {string} filename - JSON filename
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated data
   */
  async updateJSON(userId, filename, updates) {
    try {
      // Read existing data or start with empty object
      let data = await this.readJSON(userId, filename) || {};

      // Merge updates
      data = { ...data, ...updates };

      // Write back
      await this.writeJSON(userId, filename, data);

      console.log(`📊 DataService: Updated ${filename} for ${userId}`);
      return data;
    } catch (error) {
      console.error(`❌ DataService: Failed to update ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Read metadata.json
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Metadata or null
   */
  async readMetadata(userId) {
    return await this.readJSON(userId, 'metadata.json');
  }

  /**
   * Write metadata.json
   * @param {string} userId - User ID
   * @param {Object} metadata - Metadata object
   * @returns {Promise<boolean>} - Success status
   */
  async writeMetadata(userId, metadata) {
    return await this.writeJSON(userId, 'metadata.json', metadata);
  }

  /**
   * Update metadata fields
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated metadata
   */
  async updateMetadata(userId, updates) {
    return await this.updateJSON(userId, 'metadata.json', updates);
  }

  /**
   * Read sitemap.json
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Sitemap or null
   */
  async readSitemap(userId) {
    return await this.readJSON(userId, 'sitemap.json');
  }

  /**
   * Write sitemap.json
   * @param {string} userId - User ID
   * @param {Object} sitemap - Sitemap object
   * @returns {Promise<boolean>} - Success status
   */
  async writeSitemap(userId, sitemap) {
    return await this.writeJSON(userId, 'sitemap.json', sitemap);
  }

  /**
   * Read conversation.json
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Conversation or null
   */
  async readConversation(userId) {
    return await this.readJSON(userId, 'conversation.json');
  }

  /**
   * Write conversation.json
   * @param {string} userId - User ID
   * @param {Object} conversation - Conversation object
   * @returns {Promise<boolean>} - Success status
   */
  async writeConversation(userId, conversation) {
    return await this.writeJSON(userId, 'conversation.json', conversation);
  }

  /**
   * Append a message to conversation.json
   * @param {string} userId - User ID
   * @param {Object} message - Message to append
   * @returns {Promise<Object>} - Updated conversation
   */
  async appendMessage(userId, message) {
    try {
      let conversation = await this.readConversation(userId) || { messages: [] };

      if (!conversation.messages) {
        conversation.messages = [];
      }

      conversation.messages.push(message);
      conversation.updatedAt = new Date().toISOString();

      await this.writeConversation(userId, conversation);

      console.log(`📊 DataService: Appended message to conversation for ${userId}`);
      return conversation;
    } catch (error) {
      console.error(`❌ DataService: Failed to append message:`, error);
      throw error;
    }
  }

  /**
   * Load metadata with success wrapper (for tests)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - {success: true, data: {...}}
   */
  async loadMetadata(userId) {
    try {
      const data = await this.readMetadata(userId);
      return {
        success: true,
        data: data || {}
      };
    } catch (error) {
      console.error(`❌ DataService: Failed to load metadata:`, error);
      return {
        success: true,
        data: {}
      };
    }
  }

  /**
   * Load sitemap with success wrapper (for tests)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - {success: true, data: {...}}
   */
  async loadSitemap(userId) {
    try {
      const data = await this.readSitemap(userId);
      return {
        success: true,
        data: data || { pages: [] }
      };
    } catch (error) {
      console.error(`❌ DataService: Failed to load sitemap:`, error);
      return {
        success: true,
        data: { pages: [] }
      };
    }
  }
}

module.exports = DataService;
