/**
 * DeviceToggle.js
 * Manages device view toggle (desktop, tablet, mobile) for preview
 * Handles localStorage persistence of user preference
 */

class DeviceToggle extends BaseComponent {
    /**
     * @param {HTMLElement} container - Container for device toggle
     */
    constructor(container) {
        super(container);

        // Component state
        this.state = {
            currentDevice: 'desktop'
        };

        // Storage key for persistence
        this.storageKey = 'nitya_deviceView';

        this.init();
    }

    /**
     * Initialize device toggle component
     */
    init() {
        this.log('Initializing...');
        this.setupDOM();
        this.restoreSavedDevice();
        this.attachEventListeners();
        this.log('Initialized successfully');
    }

    /**
     * Setup DOM references
     */
    setupDOM() {
        // Get all device toggle buttons
        this.buttons = document.querySelectorAll('.device-toggle-btn');

        // Get preview container
        this.previewContainer = document.querySelector('.preview-container');

        if (!this.buttons || this.buttons.length === 0) {
            throw new Error('Device toggle buttons not found');
        }

        if (!this.previewContainer) {
            throw new Error('Preview container not found');
        }

        this.log(`Found ${this.buttons.length} device toggle buttons`);
    }

    /**
     * Attach event listeners to buttons
     */
    attachEventListeners() {
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleDeviceClick(btn);
            });
        });

        this.log('Event listeners attached');
    }

    /**
     * Handle device button click
     * @param {HTMLElement} button - Clicked button
     */
    handleDeviceClick(button) {
        const device = button.dataset.device;

        if (!device) {
            this.error('Button missing data-device attribute');
            return;
        }

        this.log('Device selected:', device);

        // Update active state
        this.setActiveButton(button);

        // Update preview container class
        this.setDeviceView(device);

        // Update state
        this.setState({ currentDevice: device });

        // Save preference
        this.saveDevice(device);

        // Emit event
        this.emit('deviceChanged', device);
    }

    /**
     * Set active button state
     * @param {HTMLElement} activeButton - Button to make active
     */
    setActiveButton(activeButton) {
        // Remove active from all buttons
        this.buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active to clicked button
        activeButton.classList.add('active');
    }

    /**
     * Set device view on preview container
     * @param {string} device - Device type (desktop, tablet, mobile)
     */
    setDeviceView(device) {
        if (!this.previewContainer) return;

        // Update container class
        this.previewContainer.className = `preview-container ${device}`;

        this.log('Device view updated:', device);
    }

    /**
     * Save device preference to localStorage
     * @param {string} device - Device type
     */
    saveDevice(device) {
        try {
            localStorage.setItem(this.storageKey, device);
            this.log('Device preference saved:', device);
        } catch (error) {
            this.error('Failed to save device preference:', error);
        }
    }

    /**
     * Restore saved device preference from localStorage
     */
    restoreSavedDevice() {
        try {
            const savedDevice = localStorage.getItem(this.storageKey);

            if (savedDevice) {
                this.log('Restoring saved device:', savedDevice);

                // Find button for saved device
                const button = Array.from(this.buttons).find(
                    btn => btn.dataset.device === savedDevice
                );

                if (button) {
                    // Set active button
                    this.setActiveButton(button);

                    // Set device view
                    this.setDeviceView(savedDevice);

                    // Update state
                    this.state.currentDevice = savedDevice;
                } else {
                    this.log('Saved device button not found, using default');
                }
            } else {
                this.log('No saved device preference, using default');
            }
        } catch (error) {
            this.error('Failed to restore device preference:', error);
        }
    }

    /**
     * Get current device view
     * @returns {string} Current device type
     */
    getCurrentDevice() {
        return this.state.currentDevice;
    }

    /**
     * Set device programmatically
     * @param {string} device - Device type
     */
    setDevice(device) {
        const button = Array.from(this.buttons).find(
            btn => btn.dataset.device === device
        );

        if (button) {
            this.handleDeviceClick(button);
        } else {
            this.error('Invalid device type:', device);
        }
    }

    /**
     * Render component (not much to render, UI is in HTML)
     */
    render() {
        // Device toggle UI is already in HTML
        // This component just manages state and interaction
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.log('Destroying...');

        // Clear references
        this.buttons = null;
        this.previewContainer = null;

        super.destroy();
    }
}
