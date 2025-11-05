/**
 * ChatComponent.js
 * Manages chat UI, message display, and user input
 * Extracted from V1.1 app.js monolithic file
 */

class ChatComponent extends BaseComponent {
    /**
     * @param {HTMLElement} container - Container for chat interface
     * @param {Object} dependencies - Injected services
     * @param {ChatService} dependencies.chatService - Chat API service
     * @param {MessageService} dependencies.messageService - Message state service
     */
    constructor(container, dependencies) {
        super(container);

        // Validate dependencies
        if (!dependencies.chatService) {
            throw new Error('ChatComponent requires chatService');
        }
        if (!dependencies.messageService) {
            throw new Error('ChatComponent requires messageService');
        }

        this.chatService = dependencies.chatService;
        this.messageService = dependencies.messageService;

        // Component state
        this.state = {
            isTyping: false,
            isSending: false
        };

        // Initialize component
        this.init();
    }

    /**
     * Initialize chat component
     */
    init() {
        this.log('Initializing...');
        this.setupDOM();
        this.attachEventListeners();
        this.render();
        this.log('Initialized successfully');
    }

    /**
     * Setup DOM structure
     */
    setupDOM() {
        // Chat interface already exists in HTML
        // Just get references to elements
        this.messagesContainer = document.getElementById('messages');
        this.chatInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-btn');
        this.fileInput = document.getElementById('file-input');

        if (!this.messagesContainer || !this.chatInput || !this.sendButton) {
            throw new Error('Required chat DOM elements not found');
        }

        this.log('DOM elements found');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.handleSendClick());

        // Enter key to send
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendClick();
            }
        });

        // Auto-resize textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
        });

        this.log('Event listeners attached');
    }

    /**
     * Render chat messages
     */
    render() {
        if (this.isDestroyed) return;

        const messages = this.messageService.getMessages();
        this.messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            this.renderMessage(msg);
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Render a single message
     * @param {Object} message - Message object
     */
    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        // Add avatar for user and AI messages
        if (message.role !== 'system') {
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = message.role === 'ai' ? 'N' : 'U';
            messageDiv.appendChild(avatar);
        }

        // Message bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Check for inline previews (Phase 6 feature)
        const previewMatch = message.content.match(/\[PREVIEW:\s*section=(\w+)\]([\s\S]*?)\[\/PREVIEW\]/);

        if (previewMatch) {
            const section = previewMatch[1];
            const previewHtml = previewMatch[2].trim();
            const textWithoutTags = message.content.replace(/\[PREVIEW:[\s\S]*?\[\/PREVIEW\]/g, '').trim();

            // Add text before/after preview
            if (textWithoutTags) {
                const textDiv = document.createElement('div');
                textDiv.innerHTML = textWithoutTags.replace(/\n/g, '<br>');
                bubble.appendChild(textDiv);
            }

            // Create inline preview container
            const previewContainer = document.createElement('div');
            previewContainer.className = 'inline-preview';

            const previewLabel = document.createElement('div');
            previewLabel.className = 'inline-preview-label';
            previewLabel.textContent = `${section.toUpperCase()} Preview`;

            const previewContent = document.createElement('div');
            previewContent.className = 'inline-preview-content';
            previewContent.innerHTML = previewHtml;

            previewContainer.appendChild(previewLabel);
            previewContainer.appendChild(previewContent);
            bubble.appendChild(previewContainer);
        } else {
            // Normal message (no preview tags)
            bubble.innerHTML = message.content.replace(/\n/g, '<br>');
        }

        messageDiv.appendChild(bubble);
        this.messagesContainer.appendChild(messageDiv);
    }

    /**
     * Handle send button click
     */
    async handleSendClick() {
        const message = this.chatInput.value.trim();
        if (!message || this.state.isSending) return;

        this.log('Sending message:', message);

        // Update state
        this.setState({ isSending: true });

        // Add user message
        this.addMessage('user', message);

        // Clear input
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to backend via service
            const response = await this.chatService.sendMessage(message);

            // Hide typing indicator
            this.hideTypingIndicator();

            // Extract AI message text
            const aiMessage = this.chatService.extractMessageText(response);

            // Add AI response
            this.addMessage('ai', aiMessage);

            // Emit event for other components (data detection, etc.)
            this.emit('messageSent', {
                userMessage: message,
                aiMessage: aiMessage,
                fullResponse: response
            });

            this.log('Message sent successfully');
        } catch (error) {
            this.hideTypingIndicator();
            this.error('Failed to send message:', error);
            this.addMessage('system', 'Error: ' + error.message);
        } finally {
            this.setState({ isSending: false });
        }
    }

    /**
     * Add message to display and message service
     * @param {string} role - 'user', 'ai', or 'system'
     * @param {string} content - Message content
     */
    addMessage(role, content) {
        // Add to message service (state management)
        this.messageService.addMessage(role, content);

        // Render the new message
        this.renderMessage({ role, content });

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (document.getElementById('typing')) return;

        this.setState({ isTyping: true });

        const typing = document.createElement('div');
        typing.id = 'typing';
        typing.className = 'typing-indicator';
        typing.innerHTML = `
            <div class="message-avatar">N</div>
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        this.messagesContainer.appendChild(typing);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typing = document.getElementById('typing');
        if (typing) {
            typing.remove();
        }
        this.setState({ isTyping: false });
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    /**
     * Focus input field
     */
    focus() {
        if (this.chatInput) {
            this.chatInput.focus();
        }
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messageService.clearMessages();
        this.render();
        this.log('Messages cleared');
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.log('Destroying...');

        // Remove event listeners (already handled by BaseComponent)
        // Clear references
        this.messagesContainer = null;
        this.chatInput = null;
        this.sendButton = null;
        this.fileInput = null;

        super.destroy();
    }
}
