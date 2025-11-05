/**
 * PreviewComponent.js
 * Manages the preview iframe and preview updates
 * Handles preview refresh, data updates, and fileviewer communication
 */

class PreviewComponent extends BaseComponent {
    /**
     * @param {HTMLElement} container - Container for preview section
     * @param {Object} config - Configuration
     * @param {string} config.apiUrl - Base API URL
     * @param {string} config.userId - User ID
     */
    constructor(container, config) {
        super(container);

        if (!config.apiUrl) {
            throw new Error('PreviewComponent requires apiUrl');
        }
        if (!config.userId) {
            throw new Error('PreviewComponent requires userId');
        }

        this.apiUrl = config.apiUrl;
        this.userId = config.userId;

        // Component state
        this.state = {
            lastPreviewedSection: null,
            lastPreviewedHtml: null,
            isLoading: false
        };

        this.init();
    }

    /**
     * Initialize preview component
     */
    init() {
        this.log('Initializing...');
        this.setupDOM();
        this.setupFileviewerListener();
        this.log('Initialized successfully');
    }

    /**
     * Setup DOM references
     */
    setupDOM() {
        // Get references to preview elements
        this.previewIframe = document.getElementById('preview-iframe');
        this.approvalControls = document.querySelector('.approval-controls');

        if (!this.previewIframe) {
            throw new Error('Preview iframe not found');
        }

        this.log('DOM elements found');
    }

    /**
     * Setup listener for postMessage from fileviewer iframe
     */
    setupFileviewerListener() {
        window.addEventListener('message', (event) => {
            this.handleFileviewerMessage(event);
        });

        this.log('Fileviewer listener initialized');
    }

    /**
     * Handle postMessage from fileviewer
     * @param {MessageEvent} event - Message event
     */
    handleFileviewerMessage(event) {
        // In production, validate origin
        // if (event.origin !== window.location.origin) return;

        const data = event.data;

        if (!data || !data.type) return;

        switch (data.type) {
            case 'FILE_UPLOADED':
                this.emit('fileUploaded', data.filename);
                break;

            case 'FILE_DELETED':
                this.emit('fileDeleted', data.filename);
                break;

            case 'FILE_SELECTED':
                this.emit('fileSelected', data.filename);
                break;

            default:
                this.log('Unknown fileviewer message type:', data.type);
        }
    }

    /**
     * Update preview with new section HTML
     * @param {string} section - Section name (hero, about, etc.)
     * @param {string} html - HTML content
     * @returns {Promise<Object>} Update result
     */
    async updatePreview(section, html) {
        try {
            this.log('Updating preview:', section);

            // Store for later approval
            this.setState({
                lastPreviewedSection: section,
                lastPreviewedHtml: html,
                isLoading: true
            });

            const response = await fetch(`${this.apiUrl}/api/update-preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    section: section,
                    html: html
                })
            });

            const result = await response.json();

            if (result.success) {
                this.log('Preview updated successfully');

                // Refresh iframe to show new content
                this.refreshPreview();

                // Show approval buttons
                this.showApprovalButtons();
            }

            this.setState({ isLoading: false });

            return result;
        } catch (error) {
            this.error('Failed to update preview:', error);
            this.setState({ isLoading: false });
            throw error;
        }
    }

    /**
     * Clear preview
     * @returns {Promise<Object>} Clear result
     */
    async clearPreview() {
        try {
            this.log('Clearing preview...');

            const response = await fetch(`${this.apiUrl}/api/update-preview/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.log('Preview cleared');

                // Refresh iframe
                this.refreshPreview();

                // Hide approval buttons
                this.hideApprovalButtons();

                // Clear state
                this.setState({
                    lastPreviewedSection: null,
                    lastPreviewedHtml: null
                });
            }

            return result;
        } catch (error) {
            this.error('Failed to clear preview:', error);
            throw error;
        }
    }

    /**
     * Refresh preview iframe (cache-busting reload)
     */
    refreshPreview() {
        if (!this.previewIframe) return;

        // Small delay to ensure file is written
        setTimeout(() => {
            // Use cache-busting to force reload
            const currentSrc = this.previewIframe.src.split('?')[0];
            this.previewIframe.src = `${currentSrc}?t=${Date.now()}`;

            this.log('Preview refreshed');
        }, 300);
    }

    /**
     * Show approval buttons
     */
    showApprovalButtons() {
        if (this.approvalControls) {
            this.approvalControls.style.display = 'flex';
            this.log('Approval buttons shown');
        }
    }

    /**
     * Hide approval buttons
     */
    hideApprovalButtons() {
        if (this.approvalControls) {
            this.approvalControls.style.display = 'none';
            this.log('Approval buttons hidden');
        }
    }

    /**
     * Generate final index.html
     * @param {string} html - Final HTML content
     * @returns {Promise<Object>} Generation result
     */
    async generateFinalIndex(html) {
        try {
            this.log('Generating final index.html...');

            const response = await fetch(`${this.apiUrl}/api/generate-index`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    html: html
                })
            });

            const result = await response.json();

            if (result.success) {
                this.log('Final index.html generated');

                // Switch iframe to show final index.html
                this.previewIframe.src = `${this.apiUrl}/prospects/${this.userId}/index.html?t=${Date.now()}`;

                // Hide approval buttons
                this.hideApprovalButtons();

                // Emit event
                this.emit('indexGenerated');
            }

            return result;
        } catch (error) {
            this.error('Failed to generate final index:', error);
            throw error;
        }
    }

    /**
     * Render component (not much to render, mostly iframe management)
     */
    render() {
        // Preview is already rendered in HTML
        // This component just manages the iframe
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.log('Destroying...');

        // Clear references
        this.previewIframe = null;
        this.approvalControls = null;

        super.destroy();
    }
}
