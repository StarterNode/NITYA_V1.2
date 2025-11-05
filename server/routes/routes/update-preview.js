const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { initializeFolder } = require('../utils/initializeFolder');

/**
 * POST /api/update-preview
 * Writes HTML to index.html for user to see (progressive building)
 */
router.post('/', async (req, res) => {
  try {
    const { userId, html, section } = req.body;

    if (!userId || !html) {
      return res.status(400).json({ error: 'Missing userId or html' });
    }

    // Ensure folder exists
    await initializeFolder(userId);

    const indexPath = path.join(__dirname, '../../prospects', userId, 'index.html');
    const templatePath = path.join(__dirname, '../templates/index-template.html');

    // Read current index.html or template
    let template = await fs.readFile(indexPath, 'utf8');

    // Replace placeholder with actual HTML
    // Remove the empty state and insert the HTML
    template = template.replace(
      /<div id="preview-content">[\s\S]*?<\/div>/,
      `<div id="preview-content">\n${html}\n    </div>`
    );

    // Write to index.html
    await fs.writeFile(indexPath, template);

    console.log(`✅ Index updated: ${section || 'section'} for user ${userId}`);

    res.json({
      success: true,
      section: section,
      previewUrl: `/prospects/${userId}/index.html`
    });

  } catch (error) {
    console.error('Index update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/update-preview/clear
 * Clears index.html (resets to template)
 */
router.post('/clear', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const indexPath = path.join(__dirname, '../../prospects', userId, 'index.html');
    const templatePath = path.join(__dirname, '../templates/index-template.html');

    // Copy clean template
    await fs.copyFile(templatePath, indexPath);

    console.log(`🧹 Index cleared for user ${userId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('Index clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
