const ServiceContainer = require('../services/ServiceContainer');
const CONFIG = require('../../config');

// Initialize service container
const container = new ServiceContainer(CONFIG);
container.initialize();

/**
 * Chat endpoint handler
 * Ultra-thin controller using ServiceContainer
 */
module.exports = async (req, res) => {
  try {
    const { messages, userId } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Get ChatService from container
    const chatService = container.chatService;

    // Process message
    const response = await chatService.processMessage({
      messages,
      userId: userId || 'test_user_001'
    });

    // Return response
    res.json(response);

  } catch (error) {
    console.error('❌ Chat route error:', error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
