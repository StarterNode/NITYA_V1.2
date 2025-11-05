const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { initializeFolder } = require('../utils/initializeFolder');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { userId, messages, approvedSection } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        // Initialize folder structure (creates directory + HTML templates)
        await initializeFolder(userId);

        const dir = path.join(__dirname, `../../prospects/${userId}`);
        const filePath = path.join(dir, 'conversation.json');

        // Read existing conversation if it exists
        let conversation = {
            userId: userId,
            messages: [],
            approvedSections: {},
            messageCount: 0,
            savedAt: new Date().toISOString()
        };

        try {
            const existing = await fs.readFile(filePath, 'utf8');
            conversation = JSON.parse(existing);
        } catch (error) {
            // File doesn't exist yet, use default structure
        }

        // Update messages if provided
        if (messages) {
            conversation.messages = messages;
            conversation.messageCount = messages.length;
        }

        // Add approved section if provided
        if (approvedSection) {
            const { section, html } = approvedSection;
            if (section && html) {
                conversation.approvedSections[section] = {
                    approved: true,
                    html: html,
                    timestamp: new Date().toISOString()
                };
                console.log(`✅ Section approved: ${section}`);
            }
        }

        conversation.savedAt = new Date().toISOString();

        // Write conversation.json
        await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

        console.log(`✅ Conversation saved for ${userId} (${conversation.messageCount} messages)`);
        res.json({ success: true, messageCount: conversation.messageCount });

    } catch (error) {
        console.error('❌ Error saving conversation:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
