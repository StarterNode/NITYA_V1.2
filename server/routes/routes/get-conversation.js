const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

/**
 * GET /api/get-conversation/:userId
 * Returns conversation data including approved sections
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const filePath = path.join(__dirname, `../../prospects/${userId}/conversation.json`);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            const conversation = JSON.parse(data);

            console.log(`✅ Conversation retrieved for ${userId}`);
            res.json({ success: true, conversation });
        } catch (error) {
            // File doesn't exist
            res.json({
                success: true,
                conversation: {
                    userId: userId,
                    messages: [],
                    approvedSections: {},
                    messageCount: 0
                }
            });
        }

    } catch (error) {
        console.error('❌ Error getting conversation:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
