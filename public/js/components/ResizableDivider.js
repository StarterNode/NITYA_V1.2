/**
 * ResizableDivider.js
 * Manages the resizable divider between preview and chat sections
 * Handles drag interactions, constraints, and localStorage persistence
 */

class ResizableDivider extends BaseComponent {
    /**
     * @param {HTMLElement} container - The divider element
     */
    constructor(container) {
        super(container);

        // Component state
        this.state = {
            isResizing: false,
            previewHeight: 60 // Default percentage
        };

        // Performance optimization
        this.lastUpdate = 0;
        this.throttleDelay = 16; // ~60fps
        this.saveTimeout = null;

        // Storage key
        this.storageKey = 'nitya_previewHeight';

        this.init();
    }

    /**
     * Initialize resizable divider
     */
    init() {
        this.log('Initializing...');
        this.setupDOM();
        this.restoreSavedHeight();
        this.attachEventListeners();
        this.log('Initialized successfully');
    }

    /**
     * Setup DOM references
     */
    setupDOM() {
        // Divider is the container itself
        this.divider = this.container;

        // Get sections to resize
        this.previewSection = document.querySelector('.preview-section');
        this.bottomSection = document.querySelector('.bottom-section');
        this.appContainer = document.querySelector('.app-container');

        if (!this.previewSection || !this.bottomSection || !this.appContainer) {
            throw new Error('Required sections not found for resizable divider');
        }

        this.log('DOM elements found');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Visual feedback on hover
        this.divider.addEventListener('mouseenter', () => {
            this.handleMouseEnter();
        });

        this.divider.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        });

        // Start resizing
        this.divider.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });

        // Handle resize
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Stop resizing
        document.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });

        // Handle mouse leaving window
        document.addEventListener('mouseleave', () => {
            this.handleMouseUp();
        });

        this.log('Event listeners attached');
    }

    /**
     * Handle mouse enter divider
     */
    handleMouseEnter() {
        if (!this.state.isResizing) {
            this.divider.style.background = 'var(--primary-start)';
        }
    }

    /**
     * Handle mouse leave divider
     */
    handleMouseLeave() {
        if (!this.state.isResizing) {
            this.divider.style.background = '';
        }
    }

    /**
     * Handle mouse down on divider
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        e.preventDefault();

        this.setState({ isResizing: true });

        // Visual feedback
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        this.divider.style.background = 'var(--primary-end)';
        this.divider.style.height = '12px'; // Make more prominent while dragging

        this.log('Resize started');
    }

    /**
     * Handle mouse move during resize
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.state.isResizing) return;

        // Throttle updates for better performance
        const now = Date.now();
        if (now - this.lastUpdate < this.throttleDelay) return;
        this.lastUpdate = now;

        // Get container bounds
        const containerRect = this.appContainer.getBoundingClientRect();
        const containerHeight = containerRect.height;

        // Calculate mouse position relative to container
        const mouseY = e.clientY - containerRect.top;

        // Calculate new preview height as percentage
        let newPreviewHeight = (mouseY / containerHeight) * 100;

        // Apply constraints (25% to 85%)
        newPreviewHeight = Math.max(25, Math.min(85, newPreviewHeight));

        // Only update if there's a meaningful change (reduces jitter)
        if (Math.abs(newPreviewHeight - this.state.previewHeight) > 0.5) {
            this.setPreviewHeight(newPreviewHeight);

            // Save to localStorage (debounced)
            this.debounceSave(newPreviewHeight);
        }
    }

    /**
     * Handle mouse up (stop resizing)
     */
    handleMouseUp() {
        if (!this.state.isResizing) return;

        this.setState({ isResizing: false });

        // Reset visual feedback
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
        this.divider.style.background = '';
        this.divider.style.height = ''; // Reset to default height

        this.log('Resize ended');
    }

    /**
     * Set preview height
     * @param {number} heightPercent - Height as percentage
     */
    setPreviewHeight(heightPercent) {
        if (!this.previewSection || !this.bottomSection) return;

        // Update flex basis for sections
        this.previewSection.style.flex = `0 0 ${heightPercent}%`;
        this.bottomSection.style.flex = `0 0 ${100 - heightPercent}%`;

        // Update state
        this.state.previewHeight = heightPercent;
    }

    /**
     * Debounce save to localStorage
     * @param {number} height - Height to save
     */
    debounceSave(height) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveHeight(height);
        }, 200);
    }

    /**
     * Save height to localStorage
     * @param {number} height - Height percentage
     */
    saveHeight(height) {
        try {
            localStorage.setItem(this.storageKey, height.toString());
            this.log('Height saved:', height);
        } catch (error) {
            this.error('Failed to save height:', error);
        }
    }

    /**
     * Restore saved height from localStorage
     */
    restoreSavedHeight() {
        try {
            const savedHeight = localStorage.getItem(this.storageKey);

            if (savedHeight) {
                const height = parseFloat(savedHeight);

                if (!isNaN(height) && height >= 25 && height <= 85) {
                    this.setPreviewHeight(height);
                    this.log('Restored saved height:', height);
                } else {
                    this.log('Invalid saved height, using default');
                }
            } else {
                this.log('No saved height, using default');
            }
        } catch (error) {
            this.error('Failed to restore saved height:', error);
        }
    }

    /**
     * Get current preview height
     * @returns {number} Current height percentage
     */
    getPreviewHeight() {
        return this.state.previewHeight;
    }

    /**
     * Reset to default height
     */
    resetHeight() {
        this.setPreviewHeight(60);
        this.saveHeight(60);
        this.log('Height reset to default');
    }

    /**
     * Render component (not much to render, manages behavior)
     */
    render() {
        // Divider UI is already in HTML
        // This component just manages interaction
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.log('Destroying...');

        // Clear timeouts
        clearTimeout(this.saveTimeout);

        // Clear references
        this.divider = null;
        this.previewSection = null;
        this.bottomSection = null;
        this.appContainer = null;

        super.destroy();
    }
}
