/**
 * SessionService.js (Frontend)
 * Manages session state, resumption, and conversation persistence
 * Handles checking for existing sessions and loading conversation history
 */

class SessionService {
    /**
     * @param {Object} config - Service configuration
     * @param {string} config.apiUrl - Base API URL
     * @param {string} config.userId - User ID
     * @param {MessageService} config.messageService - Message service instance
     * @param {ChatService} config.chatService - Chat service instance
     */
    constructor(config) {
        if (!config.apiUrl) {
            throw new Error('SessionService requires apiUrl');
        }
        if (!config.userId) {
            throw new Error('SessionService requires userId');
        }
        if (!config.messageService) {
            throw new Error('SessionService requires messageService');
        }
        if (!config.chatService) {
            throw new Error('SessionService requires chatService');
        }

        this.apiUrl = config.apiUrl;
        this.userId = config.userId;
        this.messageService = config.messageService;
        this.chatService = config.chatService;

        // Session state
        this.hasExistingSession = false;
        this.isResuming = false;

        this.log('SessionService initialized');
    }

    /**
     * Check if an existing session exists
     * @returns {Promise<boolean>} True if session exists
     */
    async checkForExistingSession() {
        try {
            this.log('Checking for existing session...');

            const response = await fetch(
                `${this.apiUrl}/api/get-conversation/${this.userId}`
            );

            const data = await response.json();

            // Check if conversation exists and has messages
            if (
                data.success &&
                data.conversation &&
                data.conversation.messages &&
                data.conversation.messages.length > 0
            ) {
                this.hasExistingSession = true;
                this.log(`Existing session found (${data.conversation.messages.length} messages)`);
                return true;
            }

            this.log('No existing session found');
            this.hasExistingSession = false;
            return false;
        } catch (error) {
            this.error('Failed to check for existing session:', error);
            this.hasExistingSession = false;
            return false;
        }
    }

    /**
     * Resume an existing session
     * @returns {Promise<Object>} Resumption result
     */
    async resumeSession() {
        if (this.isResuming) {
            this.log('Session resumption already in progress');
            return { success: false, reason: 'Already resuming' };
        }

        try {
            this.isResuming = true;
            this.log('Resuming session...');

            // Get conversation from backend
            const response = await fetch(
                `${this.apiUrl}/api/get-conversation/${this.userId}`
            );

            const data = await response.json();

            if (!data.success || !data.conversation || !data.conversation.messages) {
                throw new Error('Invalid conversation data');
            }

            const messages = data.conversation.messages;

            // Load messages into message service
            this.messageService.loadMessages(messages);

            this.log(`Loaded ${messages.length} messages from session`);

            // Send system message to NITYA to catch up on context
            const systemMessage = {
                role: 'user',
                content: 'SYSTEM: Resumed session detected. Please use your MCP tools to read conversation.json, metadata.json, sitemap.json, styles.css, and assets folder to catch yourself up on our progress. Then greet the user naturally and let them know where we left off.'
            };

            // Add system message to history
            this.messageService.addMessage('user', systemMessage.content);

            // Get NITYA's catch-up response
            const chatResponse = await this.chatService.sendMessage(systemMessage.content);

            // Extract AI message
            const aiMessage = this.chatService.extractMessageText(chatResponse);

            // Add AI response to history
            this.messageService.addMessage('assistant', aiMessage);

            // Save updated conversation
            await this.chatService.saveConversation();

            this.log('Session resumed successfully');

            return {
                success: true,
                messageCount: messages.length,
                catchUpMessage: aiMessage
            };
        } catch (error) {
            this.error('Failed to resume session:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isResuming = false;
        }
    }

    /**
     * Start a new session
     * @param {string} greeting - Initial greeting message
     * @returns {Promise<Object>} New session result
     */
    async startNewSession(greeting = null) {
        try {
            this.log('Starting new session...');

            // Clear any existing messages
            this.messageService.clearMessages();
            this.messageService.clearStorage();

            // Add greeting if provided
            if (greeting) {
                this.messageService.addMessage('assistant', greeting);
            }

            this.hasExistingSession = false;

            this.log('New session started');

            return {
                success: true,
                isNew: true
            };
        } catch (error) {
            this.error('Failed to start new session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get session metadata
     * @returns {Object} Session metadata
     */
    getSessionMetadata() {
        return {
            userId: this.userId,
            hasExistingSession: this.hasExistingSession,
            isResuming: this.isResuming,
            messageCount: this.messageService.getMessageCount(),
            lastMessage: this.messageService.getLastMessage()
        };
    }

    /**
     * Clear current session
     */
    async clearSession() {
        try {
            this.log('Clearing session...');

            // Clear messages
            this.messageService.clearMessages();
            this.messageService.clearStorage();

            // Reset state
            this.hasExistingSession = false;
            this.isResuming = false;

            this.log('Session cleared');

            return { success: true };
        } catch (error) {
            this.error('Failed to clear session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export session data
     * @returns {Object} Exportable session data
     */
    exportSession() {
        return {
            userId: this.userId,
            messages: this.messageService.getMessages(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import session data
     * @param {Object} sessionData - Session data to import
     * @returns {boolean} True if import successful
     */
    importSession(sessionData) {
        try {
            if (!sessionData.messages || !Array.isArray(sessionData.messages)) {
                throw new Error('Invalid session data format');
            }

            this.messageService.loadMessages(sessionData.messages);
            this.hasExistingSession = true;

            this.log(`Session imported (${sessionData.messages.length} messages)`);

            return true;
        } catch (error) {
            this.error('Failed to import session:', error);
            return false;
        }
    }

    /**
     * Log with service name
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    log(message, data = null) {
        const prefix = '[SessionService]';
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    /**
     * Log error with service name
     * @param {string} message - Error message
     * @param {*} error - Error object
     */
    error(message, error = null) {
        const prefix = '[SessionService]';
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.error(prefix, message);
        }
    }
}
