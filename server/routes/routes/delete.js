const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.delete('/:userId/:filename', async (req, res) => {
    try {
        const userId = req.params.userId;
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(__dirname, '../../prospects', userId, 'assets', filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Delete file
        await fs.unlink(filePath);

        console.log(`✅ File deleted: ${filename} for ${userId}`);

        res.json({ success: true, filename: filename });

    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
