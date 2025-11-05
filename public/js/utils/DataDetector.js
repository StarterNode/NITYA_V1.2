/**
 * DataDetector.js
 * Utility for detecting and extracting data collection tags from AI messages
 * Handles [METADATA:], [SITEMAP:], [STYLES:], [PREVIEW:], and other tags
 */

class DataDetector {
    constructor() {
        this.log('DataDetector initialized');
    }

    /**
     * Detect all data tags in a message
     * @param {string} message - AI message to analyze
     * @returns {Object} Object containing detected data
     */
    detect(message) {
        if (!message || typeof message !== 'string') {
            return {};
        }

        const detected = {};

        // Detect SITEMAP tags
        if (message.includes('[SITEMAP:')) {
            detected.sitemap = this.extractSitemap(message);
        }

        // Detect METADATA tags
        if (message.includes('[METADATA:')) {
            detected.metadata = this.extractMetadata(message);
        }

        // Detect STYLES tags
        if (message.includes('[STYLES:')) {
            detected.styles = this.extractStyles(message);
        }

        // Detect PREVIEW tags
        if (message.includes('[PREVIEW:')) {
            detected.preview = this.extractPreview(message);
        }

        // Detect CLEAR_PREVIEW tag
        if (message.includes('[CLEAR_PREVIEW]')) {
            detected.clearPreview = true;
        }

        // Detect GENERATE_INDEX tag
        if (message.includes('[GENERATE_INDEX]')) {
            detected.generateIndex = this.extractGenerateIndex(message);
        }

        // Detect GET_APPROVED_SECTIONS tag
        if (message.includes('[GET_APPROVED_SECTIONS]')) {
            detected.getApprovedSections = true;
        }

        return detected;
    }

    /**
     * Extract sitemap pages from [SITEMAP: ...] tag
     * @param {string} message - Message containing sitemap tag
     * @returns {Array|null} Array of page names
     */
    extractSitemap(message) {
        try {
            const match = message.match(/\[SITEMAP:\s*([^\]]+)\]/);
            if (!match) return null;

            const pagesStr = match[1];

            // Split by comma and clean up
            const pages = pagesStr
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            this.log('Extracted sitemap:', pages);

            return pages;
        } catch (error) {
            this.error('Failed to extract sitemap:', error);
            return null;
        }
    }

    /**
     * Extract metadata from [METADATA: key=value, ...] tag
     * @param {string} message - Message containing metadata tag
     * @returns {Object|null} Metadata object
     */
    extractMetadata(message) {
        try {
            const match = message.match(/\[METADATA:\s*([^\]]+)\]/);
            if (!match) return null;

            const dataStr = match[1];
            const metadata = {};

            // Parse key=value pairs
            const pairs = dataStr.split(',');
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split('=');
                const value = valueParts.join('='); // Handle values with = sign

                if (key && value) {
                    metadata[key.trim()] = value.trim();
                }
            });

            this.log('Extracted metadata:', metadata);

            return Object.keys(metadata).length > 0 ? metadata : null;
        } catch (error) {
            this.error('Failed to extract metadata:', error);
            return null;
        }
    }

    /**
     * Extract styles from [STYLES: key=value, ...] tag
     * @param {string} message - Message containing styles tag
     * @returns {Object|null} Styles object
     */
    extractStyles(message) {
        try {
            const match = message.match(/\[STYLES:\s*([^\]]+)\]/);
            if (!match) return null;

            const stylesStr = match[1];
            const styles = {};

            // Parse key=value pairs
            const pairs = stylesStr.split(',');
            pairs.forEach(pair => {
                const [key, ...valueParts] = pair.split('=');
                const value = valueParts.join('='); // Handle values with = sign

                if (key && value) {
                    styles[key.trim()] = value.trim();
                }
            });

            this.log('Extracted styles:', styles);

            return Object.keys(styles).length > 0 ? styles : null;
        } catch (error) {
            this.error('Failed to extract styles:', error);
            return null;
        }
    }

    /**
     * Extract preview HTML from [PREVIEW: section=name]...[/PREVIEW] tag
     * @param {string} message - Message containing preview tag
     * @returns {Object|null} Preview object with section and html
     */
    extractPreview(message) {
        try {
            const match = message.match(/\[PREVIEW:\s*section=(\w+)\]([\s\S]*?)\[\/PREVIEW\]/);
            if (!match) return null;

            const preview = {
                section: match[1],
                html: match[2].trim()
            };

            this.log('Extracted preview:', { section: preview.section, htmlLength: preview.html.length });

            return preview;
        } catch (error) {
            this.error('Failed to extract preview:', error);
            return null;
        }
    }

    /**
     * Extract final index HTML from [GENERATE_INDEX]...[/GENERATE_INDEX] tag
     * @param {string} message - Message containing generate index tag
     * @returns {string|null} HTML content
     */
    extractGenerateIndex(message) {
        try {
            const match = message.match(/\[GENERATE_INDEX\]([\s\S]*?)\[\/GENERATE_INDEX\]/);
            if (!match) return null;

            const html = match[1].trim();

            this.log('Extracted generate index:', { htmlLength: html.length });

            return html;
        } catch (error) {
            this.error('Failed to extract generate index:', error);
            return null;
        }
    }

    /**
     * Check if message contains any data tags
     * @param {string} message - Message to check
     * @returns {boolean} True if message contains data tags
     */
    hasDataTags(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        const tags = [
            '[SITEMAP:',
            '[METADATA:',
            '[STYLES:',
            '[PREVIEW:',
            '[CLEAR_PREVIEW]',
            '[GENERATE_INDEX]',
            '[GET_APPROVED_SECTIONS]'
        ];

        return tags.some(tag => message.includes(tag));
    }

    /**
     * Get all tag types present in message
     * @param {string} message - Message to analyze
     * @returns {Array} Array of tag types found
     */
    getTagTypes(message) {
        if (!message || typeof message !== 'string') {
            return [];
        }

        const types = [];

        if (message.includes('[SITEMAP:')) types.push('sitemap');
        if (message.includes('[METADATA:')) types.push('metadata');
        if (message.includes('[STYLES:')) types.push('styles');
        if (message.includes('[PREVIEW:')) types.push('preview');
        if (message.includes('[CLEAR_PREVIEW]')) types.push('clearPreview');
        if (message.includes('[GENERATE_INDEX]')) types.push('generateIndex');
        if (message.includes('[GET_APPROVED_SECTIONS]')) types.push('getApprovedSections');

        return types;
    }

    /**
     * Remove all data tags from message (for display purposes)
     * @param {string} message - Message with tags
     * @returns {string} Message without tags
     */
    stripTags(message) {
        if (!message || typeof message !== 'string') {
            return message;
        }

        let cleaned = message;

        // Remove PREVIEW tags
        cleaned = cleaned.replace(/\[PREVIEW:[\s\S]*?\[\/PREVIEW\]/g, '');

        // Remove GENERATE_INDEX tags
        cleaned = cleaned.replace(/\[GENERATE_INDEX\][\s\S]*?\[\/GENERATE_INDEX\]/g, '');

        // Remove simple tags
        cleaned = cleaned.replace(/\[SITEMAP:[^\]]*\]/g, '');
        cleaned = cleaned.replace(/\[METADATA:[^\]]*\]/g, '');
        cleaned = cleaned.replace(/\[STYLES:[^\]]*\]/g, '');
        cleaned = cleaned.replace(/\[CLEAR_PREVIEW\]/g, '');
        cleaned = cleaned.replace(/\[GET_APPROVED_SECTIONS\]/g, '');

        // Clean up extra whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

        return cleaned;
    }

    /**
     * Log with utility name
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    log(message, data = null) {
        const prefix = '[DataDetector]';
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    /**
     * Log error with utility name
     * @param {string} message - Error message
     * @param {*} error - Error object
     */
    error(message, error = null) {
        const prefix = '[DataDetector]';
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.error(prefix, message);
        }
    }
}
