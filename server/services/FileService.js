const BaseService = require('./BaseService');
const fs = require('fs').promises;
const path = require('path');

/**
 * FileService - File operations service
 * Handles reading, writing, and managing files in prospect folders
 */
class FileService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.baseProspectsPath = path.join(__dirname, '../../prospects');
  }

  /**
   * Read a file from a prospect's folder
   * @param {string} userId - User ID
   * @param {string} filename - File name (e.g., 'metadata.json', 'styles.css')
   * @returns {Promise<string>} - File contents
   */
  async readFile(userId, filename) {
    const filePath = path.join(this.baseProspectsPath, userId, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`📄 FileService: Read ${filename} for ${userId}`);
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 FileService: File ${filename} not found for ${userId}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Write a file to a prospect's folder
   * @param {string} userId - User ID
   * @param {string} filename - File name
   * @param {string} content - File contents
   * @returns {Promise<boolean>} - Success status
   */
  async writeFile(userId, filename, content) {
    const filePath = path.join(this.baseProspectsPath, userId, filename);

    try {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`📄 FileService: Wrote ${filename} for ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ FileService: Failed to write ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param {string} userId - User ID
   * @param {string} filename - File name
   * @returns {Promise<boolean>} - Whether file exists
   */
  async fileExists(userId, filename) {
    const filePath = path.join(this.baseProspectsPath, userId, filename);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   * @param {string} userId - User ID
   * @param {string} filename - File name
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(userId, filename) {
    const filePath = path.join(this.baseProspectsPath, userId, filename);

    try {
      await fs.unlink(filePath);
      console.log(`📄 FileService: Deleted ${filename} for ${userId}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 FileService: File ${filename} already deleted for ${userId}`);
        return true;
      }
      throw error;
    }
  }

  /**
   * List all files in a directory
   * @param {string} userId - User ID
   * @param {string} subdirectory - Subdirectory (e.g., 'assets', null for root)
   * @returns {Promise<Array<string>>} - List of filenames
   */
  async listFiles(userId, subdirectory = null) {
    const dirPath = subdirectory
      ? path.join(this.baseProspectsPath, userId, subdirectory)
      : path.join(this.baseProspectsPath, userId);

    try {
      const files = await fs.readdir(dirPath);
      console.log(`📄 FileService: Listed ${files.length} files in ${subdirectory || 'root'} for ${userId}`);
      return files;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 FileService: Directory not found for ${userId}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get file stats
   * @param {string} userId - User ID
   * @param {string} filename - File name
   * @returns {Promise<Object|null>} - File stats or null if not found
   */
  async getFileStats(userId, filename) {
    const filePath = path.join(this.baseProspectsPath, userId, filename);

    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read and parse JSON file (helper for tests)
   * @param {string} filePath - Full path to JSON file
   * @returns {Promise<Object>} - Parsed JSON data
   */
  async readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write JSON data to file (helper for tests)
   * @param {string} filePath - Full path to JSON file
   * @param {Object} data - Data to write
   * @returns {Promise<boolean>} - Success status
   */
  async writeJSON(filePath, data) {
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`❌ FileService: Failed to write JSON:`, error);
      throw error;
    }
  }
}

module.exports = FileService;
