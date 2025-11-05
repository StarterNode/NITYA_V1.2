const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { userId, section, data } = req.body;

        // Create section file
        const dir = `../prospects/${userId}/sections/`;
        await fs.mkdir(dir, { recursive: true });

        const content = `export const ${section}Section = ${JSON.stringify(data, null, 2)};\n`;
        await fs.writeFile(path.join(dir, `${section}.js`), content);

        // Update scope.json
        const scopePath = `../prospects/${userId}/scope.json`;
        let scope = {};

        try {
            const existing = await fs.readFile(scopePath, 'utf8');
            scope = JSON.parse(existing);
        } catch (e) {
            // File doesn't exist yet
            scope = {
                userId,
                sections: [],
                createdAt: new Date().toISOString()
            };
        }

        // Update section status
        const sectionIndex = scope.sections.findIndex(s => s.name === section);
        if (sectionIndex >= 0) {
            scope.sections[sectionIndex].approved = true;
            scope.sections[sectionIndex].approvedAt = new Date().toISOString();
        } else {
            scope.sections.push({
                name: section,
                file: `sections/${section}.js`,
                approved: true,
                approvedAt: new Date().toISOString()
            });
        }

        scope.updatedAt = new Date().toISOString();

        await fs.writeFile(scopePath, JSON.stringify(scope, null, 2));

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
