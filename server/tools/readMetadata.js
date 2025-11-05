const BaseTool = require('./BaseTool');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReadMetadataTool - Reads business data and asset mappings
 * Shows what business info has been collected and which files are mapped where
 */
class ReadMetadataTool extends BaseTool {
  constructor(dependencies = {}) {
    super(
      'read_metadata',
      'Reads business data and asset mappings from metadata.json. Shows what business info has been collected.',
      {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID whose metadata to read'
          }
        },
        required: ['userId']
      }
    );
  }

  /**
   * Read metadata.json and return business data
   * @param {Object} params - { userId: string }
   * @returns {Promise<Object>} - { success, metadata, businessName, hasLogo, hasHeroImage }
   */
  async run(params) {
    const { userId } = params;
    const metadataPath = path.join(__dirname, '../../prospects', userId, 'metadata.json');

    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      const parsed = JSON.parse(data);

      return {
        success: true,
        metadata: parsed,
        businessName: parsed.businessName || null,
        hasLogo: !!parsed.logo,
        hasHeroImage: !!parsed.heroImage
      };

    } catch (error) {
      // No metadata file = no data collected yet
      if (error.code === 'ENOENT') {
        return {
          success: true,
          metadata: {},
          businessName: null,
          hasLogo: false,
          hasHeroImage: false,
          message: 'No metadata collected yet'
        };
      }

      // Other errors
      throw error;
    }
  }
}

module.exports = ReadMetadataTool;
