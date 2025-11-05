/**
 * MessageService.js
 * Manages message state and history for the chat application
 * Handles local storage persistence and message formatting
 */

class MessageService {
    constructor() {
        this.messages = [];
        this.messageHistory = []; // For API calls (includes role/content format)
        this.storageKey = 'nitya_messages';

        this.log('MessageService initialized');
    }

    /**
     * Add a message to the chat
     * @param {string} role - 'user', 'assistant', or 'system'
     * @param {string|Array} content - Message content
     * @returns {Object} The created message object
     */
    addMessage(role, content) {
        // Normalize role name (ai -> assistant for consistency)
        if (role === 'ai') {
            role = 'assistant';
        }

        const message = {
            role,
            content,
            timestamp: new Date().toISOString()
        };

        // Add to display messages
        this.messages.push(message);

        // Add to history (format for API)
        if (role !== 'system') {
            this.messageHistory.push({
                role: role === 'assistant' ? 'assistant' : 'user',
                content: typeof content === 'string' ? content : JSON.stringify(content)
            });
        }

        // Save to localStorage
        this.saveToStorage();

        this.log('Message added:', { role, contentLength: content.length });

        return message;
    }

    /**
     * Get all messages for display
     * @returns {Array} Array of message objects
     */
    getMessages() {
        return this.messages;
    }

    /**
     * Get message history for API calls (only user/assistant messages)
     * @returns {Array} Array of message objects in API format
     */
    getMessageHistory() {
        return this.messageHistory;
    }

    /**
     * Get the last message
     * @returns {Object|null} Last message or null if no messages
     */
    getLastMessage() {
        return this.messages.length > 0
            ? this.messages[this.messages.length - 1]
            : null;
    }

    /**
     * Get messages by role
     * @param {string} role - 'user', 'assistant', or 'system'
     * @returns {Array} Filtered messages
     */
    getMessagesByRole(role) {
        return this.messages.filter(msg => msg.role === role);
    }

    /**
     * Get message count
     * @returns {number} Total number of messages
     */
    getMessageCount() {
        return this.messages.length;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messages = [];
        this.messageHistory = [];
        this.saveToStorage();
        this.log('Messages cleared');
    }

    /**
     * Load messages from array (used for session resumption)
     * @param {Array} messages - Array of message objects
     */
    loadMessages(messages) {
        if (!Array.isArray(messages)) {
            console.error('loadMessages requires an array');
            return;
        }

        this.messages = [];
        this.messageHistory = [];

        messages.forEach(msg => {
            if (msg.role && msg.content) {
                this.addMessage(msg.role, msg.content);
            }
        });

        this.log(`Loaded ${messages.length} messages`);
    }

    /**
     * Save messages to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                messages: this.messages,
                messageHistory: this.messageHistory,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save messages to localStorage:', error);
        }
    }

    /**
     * Load messages from localStorage
     * @returns {boolean} True if messages were loaded
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return false;

            const data = JSON.parse(stored);

            if (data.messages && Array.isArray(data.messages)) {
                this.messages = data.messages;
            }

            if (data.messageHistory && Array.isArray(data.messageHistory)) {
                this.messageHistory = data.messageHistory;
            }

            this.log(`Loaded ${this.messages.length} messages from storage`);
            return true;
        } catch (error) {
            console.error('Failed to load messages from localStorage:', error);
            return false;
        }
    }

    /**
     * Clear localStorage
     */
    clearStorage() {
        localStorage.removeItem(this.storageKey);
        this.log('Storage cleared');
    }

    /**
     * Find messages containing specific text
     * @param {string} searchText - Text to search for
     * @returns {Array} Matching messages
     */
    searchMessages(searchText) {
        const search = searchText.toLowerCase();
        return this.messages.filter(msg =>
            msg.content.toLowerCase().includes(search)
        );
    }

    /**
     * Get messages since a specific timestamp
     * @param {string} timestamp - ISO timestamp
     * @returns {Array} Messages after timestamp
     */
    getMessagesSince(timestamp) {
        const targetTime = new Date(timestamp).getTime();
        return this.messages.filter(msg => {
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > targetTime;
        });
    }

    /**
     * Export messages as JSON
     * @returns {string} JSON string of all messages
     */
    exportMessages() {
        return JSON.stringify({
            messages: this.messages,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import messages from JSON
     * @param {string} jsonString - JSON string of messages
     * @returns {boolean} True if import successful
     */
    importMessages(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.messages && Array.isArray(data.messages)) {
                this.loadMessages(data.messages);
                this.log('Messages imported successfully');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import messages:', error);
            return false;
        }
    }

    /**
     * Log with service name
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    log(message, data = null) {
        const prefix = '[MessageService]';
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
}
