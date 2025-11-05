/**
 * ChatService.js (Frontend)
 * Handles all API communication with the backend chat service
 * Manages message sending, conversation history, and API response formatting
 */

class ChatService {
    /**
     * @param {Object} config - Service configuration
     * @param {string} config.apiUrl - Base API URL
     * @param {string} config.userId - User ID for conversation
     * @param {MessageService} config.messageService - Message service instance
     */
    constructor(config) {
        if (!config.apiUrl) {
            throw new Error('ChatService requires apiUrl');
        }
        if (!config.userId) {
            throw new Error('ChatService requires userId');
        }
        if (!config.messageService) {
            throw new Error('ChatService requires messageService');
        }

        this.apiUrl = config.apiUrl;
        this.userId = config.userId;
        this.messageService = config.messageService;

        // Request configuration
        this.timeout = config.timeout || 60000; // 60 seconds default
        this.retryAttempts = config.retryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;

        this.log('ChatService initialized', { apiUrl: this.apiUrl, userId: this.userId });
    }

    /**
     * Send message to chat API
     * @param {string} message - User message
     * @returns {Promise<Object>} API response
     */
    async sendMessage(message) {
        if (!message || typeof message !== 'string') {
            throw new Error('Message must be a non-empty string');
        }

        this.log('Sending message:', message);

        try {
            // Get message history from service
            const messageHistory = this.messageService.getMessageHistory();

            // Build request body
            const requestBody = {
                messages: messageHistory,
                userId: this.userId
            };

            // Make API call with retry logic
            const response = await this.makeRequest('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            this.log('Received response');

            return response;
        } catch (error) {
            this.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Make HTTP request with timeout and retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(endpoint, options, attempt = 1) {
        const url = `${this.apiUrl}${endpoint}`;

        try {
            // Add timeout to fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Check response status
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}. ${errorText}`
                );
            }

            // Parse JSON response
            const data = await response.json();

            // Validate response structure
            this.validateResponse(data);

            return data;
        } catch (error) {
            // Handle timeout
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }

            // Retry on network errors
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                this.log(`Retrying request (attempt ${attempt + 1}/${this.retryAttempts})`);
                await this.delay(this.retryDelay * attempt);
                return this.makeRequest(endpoint, options, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Validate API response structure
     * @param {Object} response - API response
     * @throws {Error} If response is invalid
     */
    validateResponse(response) {
        if (!response) {
            throw new Error('Empty response from API');
        }

        if (!response.content || !Array.isArray(response.content)) {
            throw new Error('Invalid response structure: missing content array');
        }

        if (response.content.length === 0) {
            throw new Error('Invalid response structure: empty content array');
        }

        if (!response.content[0].text) {
            throw new Error('Invalid response structure: missing text in content');
        }
    }

    /**
     * Extract message text from API response
     * @param {Object} response - API response
     * @returns {string} Message text
     */
    extractMessageText(response) {
        try {
            // Handle content array format
            if (response.content && Array.isArray(response.content)) {
                // Combine all text blocks
                const textBlocks = response.content
                    .filter(block => block.type === 'text')
                    .map(block => block.text);

                return textBlocks.join('\n');
            }

            // Fallback: check for direct text property
            if (response.text) {
                return response.text;
            }

            throw new Error('Could not extract message text from response');
        } catch (error) {
            this.error('Failed to extract message text:', error);
            throw error;
        }
    }

    /**
     * Save conversation to backend
     * @returns {Promise<Object>} Save response
     */
    async saveConversation() {
        try {
            const messages = this.messageService.getMessageHistory();

            const response = await this.makeRequest('/api/save-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    messages: messages
                })
            });

            this.log(`Conversation saved (${messages.length} messages)`);

            return response;
        } catch (error) {
            this.error('Failed to save conversation:', error);
            throw error;
        }
    }

    /**
     * Check if error is retryable
     * @param {Error} error - Error object
     * @returns {boolean} True if error is retryable
     */
    isRetryableError(error) {
        // Network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return true;
        }

        // Timeout errors
        if (error.name === 'AbortError') {
            return true;
        }

        // Server errors (5xx)
        if (error.message.includes('HTTP 5')) {
            return true;
        }

        return false;
    }

    /**
     * Delay helper for retry logic
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API health status
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        try {
            const response = await this.makeRequest('/health', {
                method: 'GET'
            });

            this.log('API health check:', response);
            return response;
        } catch (error) {
            this.error('Health check failed:', error);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Log with service name
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    log(message, data = null) {
        const prefix = '[ChatService]';
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
        const prefix = '[ChatService]';
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.error(prefix, message);
        }
    }
}
