const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { initializeFolder } = require('../utils/initializeFolder');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { userId, data } = req.body;

        if (!userId || !data) {
            return res.status(400).json({ error: 'userId and data required' });
        }

        // Initialize folder if needed (creates directory structure + index.html)
        await initializeFolder(userId);

        const dir = path.join(__dirname, `../../prospects/${userId}`);
        
        const filePath = path.join(dir, 'metadata.json');
        
        // Read existing metadata if it exists
        let metadata = {};
        try {
            const existing = await fs.readFile(filePath, 'utf8');
            metadata = JSON.parse(existing);
        } catch (e) {
            // File doesn't exist yet, start fresh
        }
        
        // Merge new data with existing
        metadata = {
            ...metadata,
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        // Write metadata.json
        await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
        
        console.log(`✅ Metadata updated for ${userId}`);
        res.json({ success: true, metadata });
        
    } catch (error) {
        console.error('❌ Error updating metadata:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
