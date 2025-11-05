const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chatRoute = require('./routes/chat');
const uploadRoute = require('./routes/upload');
const saveRoute = require('./routes/save');

// Phase 3: Data Collection Routes
const updateSitemapRoute = require('./routes/update-sitemap');
const updateMetadataRoute = require('./routes/update-metadata');
const updateStylesRoute = require('./routes/update-styles');
const saveConversationRoute = require('./routes/save-conversation');

// Phase 4: Preview System
const updatePreviewRoute = require('./routes/update-preview');
const getConversationRoute = require('./routes/get-conversation');

// Phase 5: Fileviewer System
const listAssetsRoute = require('./routes/list-assets');
const deleteRoute = require('./routes/delete');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/prospects', express.static(path.join(__dirname, '../prospects')));

// Routes
app.use('/api/chat', chatRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/save', saveRoute);

// Phase 3: Data Collection Routes
app.use('/api/update-sitemap', updateSitemapRoute);
app.use('/api/update-metadata', updateMetadataRoute);
app.use('/api/update-styles', updateStylesRoute);
app.use('/api/save-conversation', saveConversationRoute);

// Phase 4: Preview System
app.use('/api/update-preview', updatePreviewRoute);
app.use('/api/get-conversation', getConversationRoute);

// Phase 5: Fileviewer System
app.use('/api/list-assets', listAssetsRoute);
app.use('/api/delete', deleteRoute);

// Phase 6: Fileviewer Embedding in Chat
app.get('/fileviewer-embed', (req, res) => {
  const userId = req.query.userId || 'test_user_001';
  const fileviewerPath = path.join(__dirname, '../prospects', userId, 'fileviewer.html');

  // Check if file exists
  if (!fs.existsSync(fileviewerPath)) {
    return res.status(404).send(`
      <html>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h2>No images uploaded yet</h2>
          <p>Upload some files first to see them here!</p>
        </body>
      </html>
    `);
  }

  res.sendFile(fileviewerPath);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CRITICAL: Root route to serve index.html (MUST be AFTER API routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/public/index.html'));
});

const PORT = process.env.PORT || 3000;

// Only start server if not in test mode
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Nitya AI Proxy Server running on http://localhost:${PORT}`);
  });
}

// Export app for testing
module.exports = app;
