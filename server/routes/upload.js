const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initializeFolder } = require('../utils/initializeFolder');

const router = express.Router();

// Configure storage - SIMPLIFIED FLAT STORAGE (no subdirectories)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const userId = req.params.userId;

            // Flat storage: prospects/[UID]/assets/[filename]
            const dir = path.join(__dirname, '../../prospects', userId, 'assets');

            // Create directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            cb(null, dir);
        } catch (error) {
            console.error('❌ Upload destination error:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Use original filename (customized by frontend)
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'));
        }
    }
});

// Route: POST /api/upload/:userId
// UID is passed in URL parameter, not in form data
router.post('/:userId', (req, res) => {
    // Extract UID from URL parameter (always available)
    const userId = req.params.userId;

    // Run multer to handle file upload
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('❌ Upload error:', err);
            return res.status(500).json({ error: err.message });
        }

        try {
            // Initialize folder structure if needed
            await initializeFolder(userId);

            // Flat storage response
            res.json({
                success: true,
                url: `/prospects/${userId}/assets/${req.file.filename}`,
                filename: req.file.filename
            });

            console.log(`✅ File uploaded: ${req.file.filename} for ${userId}`);
        } catch (error) {
            console.error('❌ Upload initialization error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

module.exports = router;
