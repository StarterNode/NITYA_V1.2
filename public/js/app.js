/**
 * app.js (NITYA V1.2)
 * Main application orchestrator - thin coordinator for modular architecture
 * All business logic extracted to components and services
 *
 * Refactored from 1000+ lines to ~200 lines
 * Week 2 - Frontend Modularization Complete
 */

class NityaApp {
    constructor() {
        // Configuration
        this.config = {
            apiUrl: 'http://localhost:3000',
            userId: 'test_user_001'
        };

        // Services (will be initialized)
        this.messageService = null;
        this.chatService = null;
        this.sessionService = null;

        // Components (will be initialized)
        this.chatComponent = null;
        this.previewComponent = null;
        this.deviceToggle = null;
        this.resizableDivider = null;

        // Utilities
        this.dataDetector = new DataDetector();

        console.log('🚀 NITYA V1.2 initializing...');
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Step 1: Initialize services
            this.initializeServices();

            // Step 2: Initialize components
            this.initializeComponents();

            // Step 3: Setup component communication
            this.setupEventHandlers();

            // Step 4: Check for existing session
            await this.checkForExistingSession();

            console.log('✅ NITYA V1.2 Ready!');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Initialize services (backend communication layer)
     */
    initializeServices() {
        console.log('📦 Initializing services...');

        // Message service (state management)
        this.messageService = new MessageService();

        // Chat service (API communication)
        this.chatService = new ChatService({
            apiUrl: this.config.apiUrl,
            userId: this.config.userId,
            messageService: this.messageService
        });

        // Session service (session management)
        this.sessionService = new SessionService({
            apiUrl: this.config.apiUrl,
            userId: this.config.userId,
            messageService: this.messageService,
            chatService: this.chatService
        });

        console.log('✅ Services initialized');
    }

    /**
     * Initialize components (UI layer)
     */
    initializeComponents() {
        console.log('🎨 Initializing components...');

        // Chat component
        this.chatComponent = new ChatComponent(
            document.querySelector('.chat-panel'),
            {
                chatService: this.chatService,
                messageService: this.messageService
            }
        );

        // Preview component
        this.previewComponent = new PreviewComponent(
            document.querySelector('.preview-section'),
            {
                apiUrl: this.config.apiUrl,
                userId: this.config.userId
            }
        );

        // Device toggle
        this.deviceToggle = new DeviceToggle(
            document.querySelector('.device-toggle-bar')
        );

        // Resizable divider
        this.resizableDivider = new ResizableDivider(
            document.querySelector('.resize-divider')
        );

        console.log('✅ Components initialized');
    }

    /**
     * Setup event handlers for component communication
     */
    setupEventHandlers() {
        console.log('🔗 Setting up event handlers...');

        // Chat component events
        this.chatComponent.on('messageSent', (data) => {
            this.handleMessageSent(data);
        });

        // Preview component events (fileviewer postMessage)
        this.previewComponent.on('fileUploaded', (filename) => {
            this.handleFileUploaded(filename);
        });

        this.previewComponent.on('fileDeleted', (filename) => {
            this.handleFileDeleted(filename);
        });

        this.previewComponent.on('fileSelected', (filename) => {
            this.handleFileSelected(filename);
        });

        console.log('✅ Event handlers setup complete');
    }

    /**
     * Handle message sent event from chat
     * @param {Object} data - Message data
     */
    handleMessageSent(data) {
        const { aiMessage } = data;

        // Detect data collection tags in AI response
        const detected = this.dataDetector.detect(aiMessage);

        // Handle sitemap updates
        if (detected.sitemap) {
            this.updateSitemap(detected.sitemap);
        }

        // Handle metadata updates
        if (detected.metadata) {
            this.updateMetadata(detected.metadata);
        }

        // Handle styles updates
        if (detected.styles) {
            this.updateStyles(detected.styles);
        }

        // Handle preview updates
        if (detected.preview) {
            this.previewComponent.updatePreview(
                detected.preview.section,
                detected.preview.html
            );
        }

        // Handle clear preview
        if (detected.clearPreview) {
            this.previewComponent.clearPreview();
        }

        // Handle generate index
        if (detected.generateIndex) {
            this.previewComponent.generateFinalIndex(detected.generateIndex);
        }

        // Save conversation after each exchange
        this.chatService.saveConversation();
    }

    /**
     * Handle file uploaded event
     * @param {string} filename - Uploaded filename
     */
    async handleFileUploaded(filename) {
        console.log('📸 File uploaded:', filename);

        // Add system message
        this.chatComponent.addMessage('system', `✅ Uploaded: ${filename}`);

        // Send natural language message to NITYA
        await this.sendAutoMessage(`I uploaded ${filename}`);
    }

    /**
     * Handle file deleted event
     * @param {string} filename - Deleted filename
     */
    async handleFileDeleted(filename) {
        console.log('🗑️ File deleted:', filename);

        // Add system message
        this.chatComponent.addMessage('system', `🗑️ Deleted: ${filename}`);

        // Send natural language message to NITYA
        await this.sendAutoMessage(`I deleted ${filename}`);
    }

    /**
     * Handle file selected event
     * @param {string} filename - Selected filename
     */
    async handleFileSelected(filename) {
        console.log('✅ File selected:', filename);

        // Add system message
        this.chatComponent.addMessage('system', `✅ Selected: ${filename}`);

        // Send natural language message to NITYA
        await this.sendAutoMessage(`I selected ${filename}`);
    }

    /**
     * Send auto-generated message to NITYA
     * @param {string} message - Message to send
     */
    async sendAutoMessage(message) {
        // Add to message history
        this.messageService.addMessage('user', message);

        // Show typing indicator
        this.chatComponent.showTypingIndicator();

        try {
            // Send to backend
            const response = await this.chatService.sendMessage(message);

            // Extract AI message
            const aiMessage = this.chatService.extractMessageText(response);

            // Hide typing indicator
            this.chatComponent.hideTypingIndicator();

            // Add AI response
            this.chatComponent.addMessage('ai', aiMessage);

            // Handle data detection
            this.handleMessageSent({ aiMessage });

        } catch (error) {
            this.chatComponent.hideTypingIndicator();
            this.chatComponent.addMessage('system', 'Error: ' + error.message);
        }
    }

    /**
     * Update sitemap via API
     * @param {Array} pages - Array of page names
     */
    async updateSitemap(pages) {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/update-sitemap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.config.userId,
                    pages: pages
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Sitemap updated:', pages);
                this.previewComponent.refreshPreview();
            }
        } catch (error) {
            console.error('❌ Failed to update sitemap:', error);
        }
    }

    /**
     * Update metadata via API
     * @param {Object} metadata - Metadata object
     */
    async updateMetadata(metadata) {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/update-metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.config.userId,
                    data: metadata
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Metadata updated:', metadata);
                this.previewComponent.refreshPreview();
            }
        } catch (error) {
            console.error('❌ Failed to update metadata:', error);
        }
    }

    /**
     * Update styles via API
     * @param {Object} styles - Styles object
     */
    async updateStyles(styles) {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/update-styles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.config.userId,
                    styles: styles
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Styles updated:', styles);
                this.previewComponent.refreshPreview();
            }
        } catch (error) {
            console.error('❌ Failed to update styles:', error);
        }
    }

    /**
     * Check for existing session and resume if found
     */
    async checkForExistingSession() {
        const hasSession = await this.sessionService.checkForExistingSession();

        if (hasSession) {
            console.log('📂 Existing session found - resuming...');

            const result = await this.sessionService.resumeSession();

            if (result.success) {
                console.log('✅ Session resumed successfully');
                // Messages are already loaded into UI by session service
                this.chatComponent.render();
            } else {
                console.log('⚠️ Session resumption failed, starting fresh');
                this.showGreeting();
            }
        } else {
            console.log('✨ New session - starting fresh');
            this.showGreeting();
        }
    }

    /**
     * Show initial greeting
     */
    showGreeting() {
        const greeting = "Hey! I'm Nitya 👋 I'm here to build your website with you. Do you have a site already or are we building from scratch?";
        this.chatComponent.addMessage('ai', greeting);
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.chatComponent) {
            this.chatComponent.addMessage('system', '❌ ' + message);
        } else {
            alert('Error: ' + message);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nityaApp = new NityaApp();
    window.nityaApp.init();
});
