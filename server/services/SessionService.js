const BaseService = require('./BaseService');

/**
 * SessionService - Session state management
 * Tracks conversation state, user context, and session resumption
 */
class SessionService extends BaseService {
  constructor(dependencies = {}) {
    super(dependencies);
    this.dataService = dependencies.dataService;
    this.sessions = new Map(); // In-memory session cache
  }

  /**
   * Get or create a session for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Session object
   */
  async getSession(userId) {
    // Check in-memory cache first
    if (this.sessions.has(userId)) {
      console.log(`🔐 SessionService: Retrieved cached session for ${userId}`);
      return this.sessions.get(userId);
    }

    // Load from disk
    const conversation = await this.dataService.readConversation(userId);

    const session = {
      userId,
      createdAt: conversation?.createdAt || new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      messageCount: conversation?.messages?.length || 0,
      isResumed: Boolean(conversation && conversation.messages && conversation.messages.length > 0)
    };

    // Cache in memory
    this.sessions.set(userId, session);

    console.log(`🔐 SessionService: Created session for ${userId} (resumed: ${session.isResumed})`);
    return session;
  }

  /**
   * Update session activity timestamp
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async touchSession(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivityAt = new Date().toISOString();
      console.log(`🔐 SessionService: Updated activity for ${userId}`);
    }
  }

  /**
   * Check if session is resumed (existing conversation)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether session is resumed
   */
  async isResumedSession(userId) {
    const session = await this.getSession(userId);
    return session.isResumed;
  }

  /**
   * Get session context for prompt building
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Context object
   */
  async getSessionContext(userId) {
    const session = await this.getSession(userId);

    return {
      userId,
      sessionType: session.isResumed ? 'resumed' : 'new',
      messageCount: session.messageCount,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt
    };
  }

  /**
   * Clear session cache (force reload from disk)
   * @param {string} userId - User ID (optional, clears all if not provided)
   */
  clearCache(userId = null) {
    if (userId) {
      this.sessions.delete(userId);
      console.log(`🔐 SessionService: Cleared cache for ${userId}`);
    } else {
      this.sessions.clear();
      console.log(`🔐 SessionService: Cleared all session cache`);
    }
  }

  /**
   * Get all active sessions
   * @returns {Array<Object>} - Active session info
   */
  getActiveSessions() {
    return Array.from(this.sessions.entries()).map(([userId, session]) => ({
      userId,
      ...session
    }));
  }

  /**
   * Build complete context for session resumption
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Complete context with all data
   */
  async buildContext(userId) {
    try {
      const fileService = this.dataService?.fileService || require('./FileService');
      const folderService = require('./FolderService');

      // Load all context data
      const [metadata, sitemap, conversation, stylesContent, assets] = await Promise.all([
        this.dataService.readMetadata(userId).catch(() => ({})),
        this.dataService.readSitemap(userId).catch(() => ({ pages: [] })),
        this.dataService.readConversation(userId).catch(() => ({ messages: [] })),
        this.dataService.fileService.readFile(userId, 'styles.css').catch(() => ''),
        this.dataService.fileService.listFiles(userId, 'assets').catch(() => [])
      ]);

      return {
        userId,
        metadata: metadata || {},
        sitemap: sitemap || { pages: [] },
        conversation: conversation || { messages: [] },
        styles: stylesContent || '',
        assets: assets || []
      };
    } catch (error) {
      console.error(`❌ SessionService: Failed to build context:`, error);
      return {
        userId,
        metadata: {},
        sitemap: { pages: [] },
        conversation: { messages: [] },
        styles: '',
        assets: []
      };
    }
  }

  /**
   * Check if user has existing session
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether session exists
   */
  async hasExistingSession(userId) {
    const conversation = await this.dataService.readConversation(userId);
    return Boolean(conversation && conversation.messages && conversation.messages.length > 0);
  }

  /**
   * Check if session is resumed (alias for isResumedSession for test compatibility)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether session is resumed
   */
  async isResumed(userId) {
    return await this.isResumedSession(userId);
  }

  /**
   * Record activity for a session (alias for touchSession for test compatibility)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async recordActivity(userId) {
    await this.touchSession(userId);
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivityAt = new Date().toISOString();
    }
  }

  /**
   * Get last activity timestamp for a user
   * @param {string} userId - User ID
   * @returns {number|null} - Timestamp in milliseconds or null
   */
  getLastActivity(userId) {
    const session = this.sessions.get(userId);
    if (session && session.lastActivityAt) {
      return new Date(session.lastActivityAt).getTime();
    }
    return null;
  }

  /**
   * Load conversation for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - {success: true, conversation: {...}}
   */
  async loadConversation(userId) {
    try {
      const conversation = await this.dataService.readConversation(userId);
      return {
        success: true,
        conversation: conversation || { messages: [] }
      };
    } catch (error) {
      console.error(`❌ SessionService: Failed to load conversation:`, error);
      return {
        success: true,
        conversation: { messages: [] }
      };
    }
  }

  /**
   * Save conversation for a user
   * @param {string} userId - User ID
   * @param {Array} messages - Message array
   * @returns {Promise<Object>} - {success: true}
   */
  async saveConversation(userId, messages) {
    try {
      const conversation = {
        messages,
        updatedAt: new Date().toISOString()
      };
      await this.dataService.writeConversation(userId, conversation);

      // Update session cache
      if (this.sessions.has(userId)) {
        const session = this.sessions.get(userId);
        session.messageCount = messages.length;
        session.lastActivityAt = new Date().toISOString();
      }

      return { success: true };
    } catch (error) {
      console.error(`❌ SessionService: Failed to save conversation:`, error);
      throw error;
    }
  }
}

module.exports = SessionService;
