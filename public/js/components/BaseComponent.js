/**
 * BaseComponent.js
 * Abstract base class for all UI components
 * Provides state management, event handling, and lifecycle methods
 */

class BaseComponent {
    /**
     * @param {HTMLElement} container - DOM element where component renders
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('BaseComponent requires a container element');
        }

        this.container = container;
        this.options = options;
        this.state = {};
        this.eventHandlers = new Map();
        this.isDestroyed = false;

        // Bind methods to preserve context
        this.render = this.render.bind(this);
        this.setState = this.setState.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Initialize component (override in subclasses)
     */
    init() {
        // Override in subclasses
    }

    /**
     * Render component (must be implemented by subclasses)
     */
    render() {
        throw new Error('BaseComponent.render() must be implemented by subclass');
    }

    /**
     * Update component state and trigger re-render
     * @param {Object} newState - Partial state to merge
     */
    setState(newState) {
        if (this.isDestroyed) {
            console.warn('Cannot setState on destroyed component');
            return;
        }

        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };

        // Trigger lifecycle hook
        this.onStateChange(oldState, this.state);

        // Re-render component
        this.render();
    }

    /**
     * Lifecycle hook called when state changes
     * @param {Object} oldState - Previous state
     * @param {Object} newState - New state
     */
    onStateChange(oldState, newState) {
        // Override in subclasses for custom behavior
    }

    /**
     * Register event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Unregister event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function to remove
     */
    off(event, handler) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit event to registered handlers
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Find element within component container
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null}
     */
    $(selector) {
        return this.container.querySelector(selector);
    }

    /**
     * Find all elements within component container
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    $$(selector) {
        return this.container.querySelectorAll(selector);
    }

    /**
     * Clean up component resources
     */
    destroy() {
        if (this.isDestroyed) return;

        // Clear all event handlers
        this.eventHandlers.clear();

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Mark as destroyed
        this.isDestroyed = true;

        console.log(`${this.constructor.name} destroyed`);
    }

    /**
     * Get component name (for debugging)
     * @returns {string}
     */
    getName() {
        return this.constructor.name;
    }

    /**
     * Log message with component name
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    log(message, data = null) {
        const prefix = `[${this.getName()}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    /**
     * Log error with component name
     * @param {string} message - Error message
     * @param {*} error - Error object
     */
    error(message, error = null) {
        const prefix = `[${this.getName()}]`;
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.error(prefix, message);
        }
    }
}
