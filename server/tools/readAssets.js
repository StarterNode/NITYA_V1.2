const BaseTool = require('./BaseTool');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReadAssetsTool - Lists all files in the user's assets folder
 * Used by NITYA to check what images/files the user has uploaded
 */
class ReadAssetsTool extends BaseTool {
  constructor(dependencies = {}) {
    super(
      'read_user_assets',
      'Lists all files in the user\'s assets folder. Use this to see what images/files the user has uploaded so you can reference them by their exact filenames. Call this immediately when user mentions uploading files or when you need to suggest which files to use where.',
      {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID whose assets folder to read (e.g., \'test_user_001\')'
          }
        },
        required: ['userId']
      }
    );
  }

  /**
   * Read assets folder and return image files
   * @param {Object} params - { userId: string }
   * @returns {Promise<Object>} - { success, files, count, message }
   */
  async run(params) {
    const { userId } = params;
    const assetsPath = path.join(__dirname, '../../prospects', userId, 'assets');

    try {
      const files = await fs.readdir(assetsPath);

      // Filter for image files only
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });

      return {
        success: true,
        files: imageFiles,
        count: imageFiles.length,
        message: imageFiles.length > 0
          ? `Found ${imageFiles.length} file(s): ${imageFiles.join(', ')}`
          : 'No files uploaded yet'
      };

    } catch (error) {
      // Folder doesn't exist yet = no files uploaded
      if (error.code === 'ENOENT') {
        return {
          success: true,
          files: [],
          count: 0,
          message: 'No files uploaded yet (assets folder does not exist)'
        };
      }

      // Other errors
      throw error;
    }
  }
}

module.exports = ReadAssetsTool;
