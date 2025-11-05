const BaseTool = require('./BaseTool');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReadSitemapTool - Reads the page structure
 * Shows what pages have been defined and approved
 */
class ReadSitemapTool extends BaseTool {
  constructor(dependencies = {}) {
    super(
      'read_sitemap',
      'Reads the page structure from sitemap.json. Shows what pages have been defined.',
      {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID whose sitemap to read'
          }
        },
        required: ['userId']
      }
    );
  }

  /**
   * Read sitemap.json and return page structure
   * @param {Object} params - { userId: string }
   * @returns {Promise<Object>} - { success, pages, pageCount }
   */
  async run(params) {
    const { userId } = params;
    const sitemapPath = path.join(__dirname, '../../prospects', userId, 'sitemap.json');

    try {
      const data = await fs.readFile(sitemapPath, 'utf-8');
      const parsed = JSON.parse(data);

      return {
        success: true,
        pages: parsed.pages || [],
        pageCount: (parsed.pages || []).length
      };

    } catch (error) {
      // No sitemap file = no pages defined yet
      if (error.code === 'ENOENT') {
        return {
          success: true,
          pages: [],
          pageCount: 0,
          message: 'No pages defined yet'
        };
      }

      // Other errors
      throw error;
    }
  }
}

module.exports = ReadSitemapTool;
