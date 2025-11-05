const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const assetsDir = path.join(__dirname, '../../prospects', userId, 'assets');

        // Check if directory exists
        try {
            await fs.access(assetsDir);
        } catch {
            // Directory doesn't exist yet - return empty array
            return res.json({ success: true, files: [] });
        }

        // Read directory
        const files = await fs.readdir(assetsDir);

        // Filter for image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'];
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        });

        // Sort alphabetically
        imageFiles.sort();

        res.json({ success: true, files: imageFiles });

    } catch (error) {
        console.error('❌ List assets error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
