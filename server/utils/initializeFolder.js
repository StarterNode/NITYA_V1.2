const fs = require('fs').promises;
const path = require('path');

/**
 * Initialize a prospect folder with directory structure and template files
 * @param {string} userId - The unique user identifier
 * @returns {Promise<{exists: boolean, created?: boolean, folderPath: string}>}
 */
async function initializeFolder(userId) {
    const folderPath = path.join('./prospects', userId);
    const indexPath = path.join(folderPath, 'index.html');
    const fileviewerPath = path.join(folderPath, 'fileviewer.html');

    try {
        // Check if index.html already exists
        await fs.access(indexPath);

        // If index.html exists, check/create missing template files

        // Check/create fileviewer.html (Phase 5)
        try {
            await fs.access(fileviewerPath);
        } catch {
            const fileviewerTemplatePath = path.join(__dirname, '../templates/fileviewer-template.html');
            const fileviewerTemplate = await fs.readFile(fileviewerTemplatePath, 'utf8');
            await fs.writeFile(fileviewerPath, fileviewerTemplate);
            console.log(`✅ Created fileviewer.html for user ${userId}`);
        }

        return { exists: true, folderPath };
    } catch {
        // Doesn't exist, create everything

        // 1. Create directory structure (FLAT STORAGE - Phase 5)
        await fs.mkdir(path.join(folderPath, 'assets'), { recursive: true });

        // 2. Copy index.html template
        const indexTemplatePath = path.join(__dirname, '../templates/index-template.html');
        const indexTemplate = await fs.readFile(indexTemplatePath, 'utf8');
        await fs.writeFile(indexPath, indexTemplate);

        // 3. Copy fileviewer.html template (Phase 5)
        const fileviewerTemplatePath = path.join(__dirname, '../templates/fileviewer-template.html');
        const fileviewerTemplate = await fs.readFile(fileviewerTemplatePath, 'utf8');
        await fs.writeFile(fileviewerPath, fileviewerTemplate);

        console.log(`✅ Initialized folder for user ${userId} (flat storage)`);
        return { exists: false, created: true, folderPath };
    }
}

module.exports = { initializeFolder };
