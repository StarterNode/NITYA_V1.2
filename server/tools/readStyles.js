const BaseTool = require('./BaseTool');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReadStylesTool - Reads brand colors, fonts, and reference site
 * Shows what brand identity has been set
 */
class ReadStylesTool extends BaseTool {
  constructor(dependencies = {}) {
    super(
      'read_styles',
      'Reads brand colors, fonts, and reference site from styles.css. Shows what brand identity has been set.',
      {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID whose styles to read'
          }
        },
        required: ['userId']
      }
    );
  }

  /**
   * Read styles.css and parse brand identity
   * @param {Object} params - { userId: string }
   * @returns {Promise<Object>} - { success, primaryColor, fontHeading, referenceSite, rawCSS }
   */
  async run(params) {
    const { userId } = params;
    const stylesPath = path.join(__dirname, '../../prospects', userId, 'styles.css');

    try {
      const data = await fs.readFile(stylesPath, 'utf-8');

      // Parse CSS for key info
      const primaryColorMatch = data.match(/--primary-color:\s*([^;]+)/);
      const fontMatch = data.match(/--font-heading:\s*([^;]+)/);
      const referenceMatch = data.match(/\/\*\s*Reference:\s*([^\*]+)\*\//);

      return {
        success: true,
        styles: data, // Full CSS content
        primaryColor: primaryColorMatch ? primaryColorMatch[1].trim() : null,
        fontHeading: fontMatch ? fontMatch[1].trim() : null,
        referenceSite: referenceMatch ? referenceMatch[1].trim() : null,
        rawCSS: data.substring(0, 500) + '...' // First 500 chars for context
      };

    } catch (error) {
      // No styles file = no brand styles set yet
      if (error.code === 'ENOENT') {
        return {
          success: true,
          styles: '',
          primaryColor: null,
          fontHeading: null,
          referenceSite: null,
          message: 'No brand styles set yet'
        };
      }

      // Other errors
      throw error;
    }
  }
}

module.exports = ReadStylesTool;
