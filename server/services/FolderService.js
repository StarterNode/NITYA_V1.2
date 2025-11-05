const BaseService = require('./BaseService');
const fs = require('fs').promises;
const path = require('path');

/**
 * FolderService - Directory management service
 * Handles creating and managing prospect folder structures
 */
class FolderService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.baseProspectsPath = path.join(__dirname, '../../prospects');
  }

  /**
   * Initialize a complete prospect folder structure
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result with created directories
   */
  async initializeProspectFolder(userId) {
    const userPath = path.join(this.baseProspectsPath, userId);
    const assetsPath = path.join(userPath, 'assets');

    try {
      // Create main user directory
      await fs.mkdir(userPath, { recursive: true });

      // Create assets subdirectory
      await fs.mkdir(assetsPath, { recursive: true });

      console.log(`📁 FolderService: Initialized folder structure for ${userId}`);

      return {
        success: true,
        userId,
        paths: {
          root: userPath,
          assets: assetsPath
        }
      };
    } catch (error) {
      console.error(`❌ FolderService: Failed to initialize folder for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a prospect folder exists
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether folder exists
   */
  async folderExists(userId) {
    const userPath = path.join(this.baseProspectsPath, userId);

    try {
      await fs.access(userPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a subdirectory in prospect folder
   * @param {string} userId - User ID
   * @param {string} subdirectory - Subdirectory name
   * @returns {Promise<boolean>} - Success status
   */
  async createSubdirectory(userId, subdirectory) {
    const dirPath = path.join(this.baseProspectsPath, userId, subdirectory);

    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 FolderService: Created ${subdirectory} for ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ FolderService: Failed to create ${subdirectory}:`, error);
      throw error;
    }
  }

  /**
   * Get folder structure for a prospect
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Folder structure info
   */
  async getFolderStructure(userId) {
    const userPath = path.join(this.baseProspectsPath, userId);

    try {
      const exists = await this.folderExists(userId);

      if (!exists) {
        return {
          exists: false,
          userId,
          directories: []
        };
      }

      const entries = await fs.readdir(userPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      return {
        exists: true,
        userId,
        path: userPath,
        directories
      };
    } catch (error) {
      console.error(`❌ FolderService: Failed to get structure for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a prospect folder (use with caution)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProspectFolder(userId) {
    const userPath = path.join(this.baseProspectsPath, userId);

    try {
      await fs.rm(userPath, { recursive: true, force: true });
      console.log(`📁 FolderService: Deleted folder for ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ FolderService: Failed to delete folder for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get the assets folder path for a user
   * @param {string} userId - User ID
   * @returns {string} - Assets folder path
   */
  getAssetsPath(userId) {
    return path.join(this.baseProspectsPath, userId, 'assets');
  }

  /**
   * Get the root folder path for a user
   * @param {string} userId - User ID
   * @returns {string} - Root folder path
   */
  getUserPath(userId) {
    return path.join(this.baseProspectsPath, userId);
  }
}

module.exports = FolderService;
