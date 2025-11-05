const App = {
    // State
    userId: 'test_user_001',
    currentSection: 'hero',
    sectionData: {
        hero: {},
        about: {},
        services: {},
        contact: {}
    },
    sectionsApproved: [],
    messageHistory: [],
    // Phase 4: Track last previewed section for approval
    lastPreviewedSection: null,
    lastPreviewedHtml: null,
    
    // Initialize
    async init() {
        console.log('🚀 Nitya AI initializing...');
        this.bindEvents();
        this.setupFileViewerListener();
        this.initResizableDivider();
        this.initDeviceToggle();
        await this.checkForExistingSession();
        console.log('✅ Ready!');
    },
    
    // Bind UI events
    bindEvents() {
        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('user-input');
        const fileInput = document.getElementById('file-input');

        sendBtn.onclick = () => this.sendMessage();
        input.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };

        fileInput.onchange = (e) => this.handleFileUpload(e);

        // Phase 6: Approval buttons removed - approval now via chat keywords

        // Auto-resize textarea
        input.oninput = function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        };
    },
    
    // Show initial greeting
    showGreeting() {
        const greeting = "Hey! I'm Nitya 👋 I'm here to build your website with you. Do you have a site already or are we building from scratch?";
        this.addMessage('ai', greeting);
    },

    // ===== SESSION RESUMPTION =====
    async checkForExistingSession() {
        try {
            // Check if conversation.json exists and has messages
            const response = await fetch(`http://localhost:3000/api/get-conversation/${this.userId}`);
            const data = await response.json();

            if (data.success && data.conversation && data.conversation.messages && data.conversation.messages.length > 0) {
                console.log('📂 Resumed session detected - loading history...');

                // Load existing conversation into UI
                this.messageHistory = data.conversation.messages;

                // Display existing messages in chat
                data.conversation.messages.forEach(msg => {
                    if (msg.role === 'assistant') {
                        this.addMessage('ai', msg.content);
                    } else if (msg.role === 'user') {
                        this.addMessage('user', msg.content);
                    }
                });

                // Add system message to trigger NITYA's context refresh
                this.messageHistory.push({
                    role: 'user',
                    content: 'SYSTEM: Resumed session detected. Please use your MCP tools to read conversation.json, metadata.json, sitemap.json, styles.css, and assets folder to catch yourself up on our progress. Then greet the user naturally and let them know where we left off.'
                });

                // Show typing indicator
                this.showTyping();

                // Get NITYA's catch-up response
                const chatResponse = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: this.messageHistory
                    })
                });

                if (!chatResponse.ok) {
                    throw new Error(`HTTP ${chatResponse.status}: ${chatResponse.statusText}`);
                }

                const chatData = await chatResponse.json();

                if (!chatData || !chatData.content || !chatData.content[0] || !chatData.content[0].text) {
                    throw new Error('Invalid response from API');
                }

                const nityaMessage = chatData.content[0].text;

                // Hide typing
                this.hideTyping();

                // Add Nitya's response
                this.addMessage('ai', nityaMessage);

                // Store in history
                this.messageHistory.push({
                    role: 'assistant',
                    content: nityaMessage
                });

                // Save conversation
                await this.saveConversation();

            } else {
                console.log('✨ New session - starting fresh');
                // New session - show greeting
                this.showGreeting();
            }
        } catch (error) {
            console.error('Session check failed:', error);
            // If check fails, proceed as new session
            this.showGreeting();
        }
    },

    // Send message to Nitya
    async sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        if (!message) return;
        
        // Add user message
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';
        
        // Show typing
        this.showTyping();
        
        // Store in history
        this.messageHistory.push({
            role: 'user',
            content: message
        });
        
        // Call API
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response structure
            if (!data || !data.content || !data.content[0] || !data.content[0].text) {
                console.error('Invalid API response:', data);
                throw new Error('Invalid response from API');
            }

            const nityaMessage = data.content[0].text;
            
            // Hide typing
            this.hideTyping();
            
            // Add Nitya's response
            this.addMessage('ai', nityaMessage);
            
            // Store in history
            this.messageHistory.push({
                role: 'assistant',
                content: nityaMessage
            });
            
            // Check for upload requests
            this.detectUploadRequest(nityaMessage);
            
            // Phase 3: Detect data collection tags
            this.detectDataCollection(nityaMessage);
            
            // Save conversation after each exchange
            await this.saveConversation();
            
        } catch (error) {
            this.hideTyping();
            this.addMessage('system', 'Error: ' + error.message);
        }
    },
    
    // Add message to UI (Phase 6: Enhanced for inline previews)
    addMessage(type, content) {
        const container = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        if (type !== 'system') {
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = type === 'ai' ? 'N' : 'U';
            messageDiv.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Phase 6: Extract and render inline previews
        const previewMatch = content.match(/\[PREVIEW:\s*section=(\w+)\]([\s\S]*?)\[\/PREVIEW\]/);

        if (previewMatch) {
            const section = previewMatch[1];
            const previewHtml = previewMatch[2].trim();
            const textWithoutTags = content.replace(/\[PREVIEW:[\s\S]*?\[\/PREVIEW\]/g, '').trim();

            // Add text (if any) before/after preview
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
            bubble.innerHTML = content.replace(/\n/g, '<br>');
        }

        messageDiv.appendChild(bubble);
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    },
    
    // Typing indicator
    showTyping() {
        const container = document.getElementById('messages');
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
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    },
    
    hideTyping() {
        const typing = document.getElementById('typing');
        if (typing) typing.remove();
    },
    
    // Detect upload requests
    detectUploadRequest(message) {
        const lower = message.toLowerCase();
        if (lower.includes('upload') || lower.includes('add a logo') || lower.includes('add a photo')) {
            this.showUploadButton();
        }
    },
    
    showUploadButton() {
        const container = document.getElementById('messages');
        const btn = document.createElement('button');
        btn.className = 'btn-upload';
        btn.innerHTML = '📎 Upload File';
        btn.onclick = () => document.getElementById('file-input').click();
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message system';
        msgDiv.appendChild(btn);
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },
    
    // Handle file uploads
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.addMessage('system', '⏳ Uploading...');

        try {
            const formData = new FormData();
            // UID is now in URL, not in form data
            formData.append('file', file);

            // UID in URL path, not in form data
            const response = await fetch(`http://localhost:3000/api/upload/${this.userId}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.addMessage('system', '✅ Uploaded!');
                // Refresh preview iframe to show uploaded image
                this.refreshPreview();
            } else {
                this.addMessage('system', '❌ Upload failed: ' + (result.error || 'Unknown error'));
            }

        } catch (error) {
            this.addMessage('system', '❌ Upload failed: ' + error.message);
        }
    },
    
    // Render preview
    renderPreview() {
        const container = document.getElementById('preview-content');
        const section = this.currentSection;
        const data = this.sectionData[section];

        if (Object.keys(data).length === 0) {
            return; // Nothing to show yet
        }

        // Render based on section
        let html = '';
        if (section === 'hero') {
            html = this.renderHero(data);
        } else if (section === 'about') {
            html = this.renderAbout(data);
        } else if (section === 'services') {
            html = this.renderServices(data);
        } else if (section === 'contact') {
            html = this.renderContact(data);
        }

        container.innerHTML = html;

        // Show approve button
        document.getElementById('approve-btn').style.display = 'block';
    },

    // Refresh preview iframe
    refreshPreview() {
        const iframe = document.getElementById('preview-iframe');
        if (iframe) {
            // Small delay to ensure file is written
            setTimeout(() => {
                // Use cache-busting instead of reload() to avoid CORS issues
                iframe.src = iframe.src.split('?')[0] + '?t=' + Date.now();
            }, 300);
        }
    },
    
    renderHero(data) {
        return `
            <div class="preview-section hero">
                ${data.logo ? `<img src="${data.logo}" class="logo">` : ''}
                <h1>${data.headline || '[Your Headline]'}</h1>
                <p>${data.subheadline || ''}</p>
            </div>
        `;
    },
    
    renderAbout(data) {
        return `
            <div class="preview-section">
                <h2>${data.headline || 'About Us'}</h2>
                <p>${data.story || '[Your story here]'}</p>
            </div>
        `;
    },
    
    renderServices(data) {
        const services = data.services || [];
        return `
            <div class="preview-section">
                <h2>Services</h2>
                ${services.map(s => `<p>• ${s}</p>`).join('')}
            </div>
        `;
    },
    
    renderContact(data) {
        return `
            <div class="preview-section">
                <h2>Contact</h2>
                <p>Email: ${data.email || ''}</p>
                <p>Phone: ${data.phone || ''}</p>
            </div>
        `;
    },
    
    // Phase 4: Approve current section
    async approveCurrentSection() {
        // Hide approval buttons
        this.hideApprovalButtons();

        // Save approved section to conversation.json
        if (this.lastPreviewedSection && this.lastPreviewedHtml) {
            try {
                const response = await fetch('http://localhost:3000/api/save-conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.userId,
                        approvedSection: {
                            section: this.lastPreviewedSection,
                            html: this.lastPreviewedHtml
                        }
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log(`✅ Section approved and saved: ${this.lastPreviewedSection}`);
                    this.addMessage('system', `✅ ${this.lastPreviewedSection.toUpperCase()} section approved!`);
                }
            } catch (error) {
                console.error('❌ Error saving approved section:', error);
            }
        }

        // Send approval message to Nitya
        const input = document.getElementById('user-input');
        input.value = 'Approved!';
        await this.sendMessage();
    },

    // Phase 4: Request changes to current section
    requestSectionChanges() {
        // Hide approval buttons
        this.hideApprovalButtons();

        // Add system message
        this.addMessage('system', 'What changes would you like to make?');

        // Focus on input
        document.getElementById('user-input').focus();
    },

    // Phase 4: Show approval buttons
    showApprovalButtons() {
        const controls = document.querySelector('.approval-controls');
        if (controls) {
            controls.style.display = 'flex';
        }
    },

    // Phase 4: Hide approval buttons
    hideApprovalButtons() {
        const controls = document.querySelector('.approval-controls');
        if (controls) {
            controls.style.display = 'none';
        }
    },
    
    // Save section data
    async saveSection(section) {
        try {
            await fetch('http://localhost:3000/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    section: section,
                    data: this.sectionData[section]
                })
            });
        } catch (error) {
            console.error('Save error:', error);
        }
    },
    
    // ===== PHASE 3: DATA COLLECTION DETECTION =====

    detectDataCollection(message) {
        // Detect SITEMAP tags
        if (message.includes('[SITEMAP:')) {
            const pages = this.extractSitemap(message);
            if (pages.length > 0) {
                this.updateSitemap(pages);
            }
        }

        // Detect METADATA tags
        if (message.includes('[METADATA:')) {
            const metadata = this.extractMetadata(message);
            if (Object.keys(metadata).length > 0) {
                this.updateMetadata(metadata);
            }
        }

        // Detect STYLES tags
        if (message.includes('[STYLES:')) {
            const styles = this.extractStyles(message);
            if (Object.keys(styles).length > 0) {
                this.updateStyles(styles);
            }
        }

        // Phase 4: Detect PREVIEW tags
        if (message.includes('[PREVIEW:')) {
            const preview = this.extractPreview(message);
            if (preview) {
                this.updatePreview(preview.section, preview.html);
            }
        }

        // Phase 4: Detect CLEAR_PREVIEW tag
        if (message.includes('[CLEAR_PREVIEW]')) {
            this.clearPreview();
        }

        // Phase 4: Detect GET_APPROVED_SECTIONS tag
        if (message.includes('[GET_APPROVED_SECTIONS]')) {
            this.sendApprovedSections();
        }

        // Phase 4: Detect GENERATE_INDEX tag
        if (message.includes('[GENERATE_INDEX]')) {
            const finalHtml = this.extractGenerateIndex(message);
            if (finalHtml) {
                this.generateFinalIndex(finalHtml);
            }
        }
    },
    
    // Extract pages from SITEMAP tag
    extractSitemap(message) {
        const match = message.match(/\[SITEMAP:\s*([^\]]+)\]/);
        if (match) {
            const pagesStr = match[1];
            // Split by comma and clean up
            return pagesStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
        }
        return [];
    },
    
    // Extract metadata from METADATA tag
    extractMetadata(message) {
        const metadata = {};
        const match = message.match(/\[METADATA:\s*([^\]]+)\]/);
        if (match) {
            const dataStr = match[1];
            // Parse key=value pairs
            const pairs = dataStr.split(',');
            pairs.forEach(pair => {
                const [key, value] = pair.split('=').map(s => s.trim());
                if (key && value) {
                    metadata[key] = value;
                }
            });
        }
        return metadata;
    },
    
    // Extract styles from STYLES tag
    extractStyles(message) {
        const styles = {};
        const match = message.match(/\[STYLES:\s*([^\]]+)\]/);
        if (match) {
            const stylesStr = match[1];
            // Parse key=value pairs
            const pairs = stylesStr.split(',');
            pairs.forEach(pair => {
                const [key, value] = pair.split('=').map(s => s.trim());
                if (key && value) {
                    styles[key] = value;
                }
            });
        }
        return styles;
    },

    // Phase 4: Extract preview HTML from PREVIEW tag
    extractPreview(message) {
        const match = message.match(/\[PREVIEW:\s*section=(\w+)\]([\s\S]*?)\[\/PREVIEW\]/);
        if (match) {
            return {
                section: match[1],
                html: match[2].trim()
            };
        }
        return null;
    },

    // Phase 4: Extract final index HTML from GENERATE_INDEX tag
    extractGenerateIndex(message) {
        const match = message.match(/\[GENERATE_INDEX\]([\s\S]*?)\[\/GENERATE_INDEX\]/);
        if (match) {
            return match[1].trim();
        }
        return null;
    },
    
    // API call to update sitemap
    async updateSitemap(pages) {
        try {
            const response = await fetch('http://localhost:3000/api/update-sitemap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    pages: pages
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ Sitemap updated:', result.sitemap);
                this.refreshPreview(); // Reload preview to show updated pages
            }
        } catch (error) {
            console.error('❌ Error updating sitemap:', error);
        }
    },
    
    // API call to update metadata
    async updateMetadata(data) {
        try {
            const response = await fetch('http://localhost:3000/api/update-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    data: data
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ Metadata updated:', result.metadata);
                this.refreshPreview(); // Reload preview to show updated business info
            }
        } catch (error) {
            console.error('❌ Error updating metadata:', error);
        }
    },
    
    // API call to update styles
    async updateStyles(styles) {
        try {
            const response = await fetch('http://localhost:3000/api/update-styles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    styles: styles
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('✅ Styles updated:', result.styles);
                this.refreshPreview(); // Reload preview to show updated styles
            }
        } catch (error) {
            console.error('❌ Error updating styles:', error);
        }
    },
    
    // Save full conversation
    async saveConversation() {
        try {
            const response = await fetch('http://localhost:3000/api/save-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    messages: this.messageHistory
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log(`✅ Conversation saved (${result.messageCount} messages)`);
            }
        } catch (error) {
            console.error('❌ Error saving conversation:', error);
        }
    },

    // Phase 4: Update preview.html with section HTML
    async updatePreview(section, html) {
        try {
            // Store section and HTML for later approval
            this.lastPreviewedSection = section;
            this.lastPreviewedHtml = html;

            const response = await fetch('http://localhost:3000/api/update-preview', {
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
                console.log(`✅ Preview updated: ${section}`);
                // Refresh preview iframe to show the new section
                this.refreshPreview();
                // Show approval buttons
                this.showApprovalButtons();
            }
        } catch (error) {
            console.error('❌ Error updating preview:', error);
        }
    },

    // Phase 4: Clear preview.html
    async clearPreview() {
        try {
            const response = await fetch('http://localhost:3000/api/update-preview/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('🧹 Preview cleared');
                this.refreshPreview();
                // Hide approval buttons when preview is cleared
                this.hideApprovalButtons();
            }
        } catch (error) {
            console.error('❌ Error clearing preview:', error);
        }
    },

    // Phase 4: Send approved sections to Nitya
    async sendApprovedSections() {
        try {
            // Fetch conversation data from backend
            const response = await fetch(`http://localhost:3000/api/get-conversation/${this.userId}`);
            const result = await response.json();

            if (result.success && result.conversation) {
                const approvedSections = result.conversation.approvedSections || {};
                const sectionList = Object.keys(approvedSections);

                // Create a message showing approved sections
                let message = `Here are the approved sections:\n\n`;
                sectionList.forEach(section => {
                    message += `**${section.toUpperCase()}:**\n${approvedSections[section].html}\n\n`;
                });

                // Add as system message (Nitya can now use this data)
                this.addMessage('system', `✅ Loaded ${sectionList.length} approved sections`);
                console.log('📦 Approved sections:', approvedSections);

                // We need to inject this into Nitya's conversation context
                // For now, we'll store it and Nitya will need to reference it from conversation
            }
        } catch (error) {
            console.error('❌ Error fetching approved sections:', error);
        }
    },

    // Phase 4: Generate final index.html
    async generateFinalIndex(html) {
        try {
            const response = await fetch('http://localhost:3000/api/generate-index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    html: html
                })
            });
            const result = await response.json();

            if (result.success) {
                console.log('✅ Final index.html generated');
                this.addMessage('system', '🎉 Final mockup generated!');

                // Switch preview iframe to show final index.html instead of preview.html
                const iframe = document.getElementById('preview-iframe');
                iframe.src = `http://localhost:3000/prospects/${this.userId}/index.html?t=${Date.now()}`;

                // Hide approval buttons (no longer needed)
                this.hideApprovalButtons();
            }
        } catch (error) {
            console.error('❌ Error generating final index:', error);
        }
    },

    // ===== PHASE 5: FILEVIEWER INTEGRATION =====

    /**
     * Listen for postMessage from fileviewer
     */
    setupFileViewerListener() {
        window.addEventListener('message', (event) => {
            // In production, validate origin
            // if (event.origin !== window.location.origin) return;

            const data = event.data;

            if (data.type === 'FILE_UPLOADED') {
                this.handleFileUploaded(data.filename);
            } else if (data.type === 'FILE_DELETED') {
                this.handleFileDeleted(data.filename);
            } else if (data.type === 'FILE_SELECTED') {
                this.handleFileSelected(data.filename);
            }
        });
        console.log('📸 Fileviewer listener initialized');
    },

    /**
     * Handle file upload event from fileviewer
     */
    async handleFileUploaded(filename) {
        // Add system message
        this.addMessage('system', `✅ Uploaded: ${filename}`);

        // Create natural language message to NITYA
        const message = `I uploaded ${filename}`;

        // Store in history
        this.messageHistory.push({
            role: 'user',
            content: message
        });

        // Show typing
        this.showTyping();

        // Send to NITYA
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            const data = await response.json();
            const nityaMessage = data.content[0].text;

            // Hide typing
            this.hideTyping();

            // Add Nitya's response
            this.addMessage('ai', nityaMessage);

            // Store in history
            this.messageHistory.push({
                role: 'assistant',
                content: nityaMessage
            });

            // Detect data collection
            this.detectDataCollection(nityaMessage);

            // Save conversation
            await this.saveConversation();

        } catch (error) {
            this.hideTyping();
            this.addMessage('system', 'Error: ' + error.message);
        }
    },

    /**
     * Handle file deletion event from fileviewer
     */
    async handleFileDeleted(filename) {
        // Add system message
        this.addMessage('system', `🗑️ Deleted: ${filename}`);

        // Create natural language message to NITYA
        const message = `I deleted ${filename}`;

        // Store in history
        this.messageHistory.push({
            role: 'user',
            content: message
        });

        // Show typing
        this.showTyping();

        // Send to NITYA
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            const data = await response.json();
            const nityaMessage = data.content[0].text;

            // Hide typing
            this.hideTyping();

            // Add Nitya's response
            this.addMessage('ai', nityaMessage);

            // Store in history
            this.messageHistory.push({
                role: 'assistant',
                content: nityaMessage
            });

            // Detect data collection
            this.detectDataCollection(nityaMessage);

            // Save conversation
            await this.saveConversation();

        } catch (error) {
            this.hideTyping();
            this.addMessage('system', 'Error: ' + error.message);
        }
    },

    /**
     * Handle file selection event from fileviewer (Phase 6: Chat-First Embedding)
     */
    async handleFileSelected(filename) {
        // Add system message
        this.addMessage('system', `✅ Selected: ${filename}`);

        // Create natural language message to NITYA
        const message = `I selected ${filename}`;

        // Store in history
        this.messageHistory.push({
            role: 'user',
            content: message
        });

        // Show typing
        this.showTyping();

        // Send to NITYA
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            const data = await response.json();
            const nityaMessage = data.content[0].text;

            // Hide typing
            this.hideTyping();

            // Add Nitya's response
            this.addMessage('ai', nityaMessage);

            // Store in history
            this.messageHistory.push({
                role: 'assistant',
                content: nityaMessage
            });

            // Detect data collection
            this.detectDataCollection(nityaMessage);

            // Save conversation
            await this.saveConversation();

        } catch (error) {
            this.hideTyping();
            this.addMessage('system', 'Error: ' + error.message);
        }
    },

    // ===== PHASE 6 FINAL: RESIZABLE DIVIDER =====

    initResizableDivider() {
        const divider = document.querySelector('.resize-divider');
        const previewSection = document.querySelector('.preview-section');
        const bottomSection = document.querySelector('.bottom-section');
        const container = document.querySelector('.app-container');

        let isResizing = false;
        let lastUpdate = 0;
        const throttleDelay = 16; // ~60fps

        // Add visual feedback on hover
        divider.addEventListener('mouseenter', () => {
            if (!isResizing) {
                divider.style.background = 'var(--primary-start)';
            }
        });

        divider.addEventListener('mouseleave', () => {
            if (!isResizing) {
                divider.style.background = '';
            }
        });

        divider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection
            divider.style.background = 'var(--primary-end)';
            divider.style.height = '12px'; // Make it more prominent while dragging
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // Throttle updates for better performance
            const now = Date.now();
            if (now - lastUpdate < throttleDelay) return;
            lastUpdate = now;

            // Get container bounds
            const containerRect = container.getBoundingClientRect();
            const containerHeight = containerRect.height;

            // Calculate mouse position relative to container
            const mouseY = e.clientY - containerRect.top;

            // Calculate new preview height as percentage
            let newPreviewHeight = (mouseY / containerHeight) * 100;

            // Apply constraints with smoother boundaries
            newPreviewHeight = Math.max(25, Math.min(85, newPreviewHeight));

            // Only update if there's a meaningful change (reduces jitter)
            const currentHeight = parseFloat(previewSection.style.flex.split(' ')[2]) || 60;
            if (Math.abs(newPreviewHeight - currentHeight) > 0.5) {
                previewSection.style.flex = `0 0 ${newPreviewHeight}%`;
                bottomSection.style.flex = `0 0 ${100 - newPreviewHeight}%`;

                // Save to localStorage (debounced)
                clearTimeout(this._saveTimeout);
                this._saveTimeout = setTimeout(() => {
                    localStorage.setItem('previewHeight', newPreviewHeight);
                }, 200);
            }
        });

        const stopResizing = () => {
            if (!isResizing) return;

            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
            divider.style.background = '';
            divider.style.height = ''; // Reset to default height
        };

        document.addEventListener('mouseup', stopResizing);
        document.addEventListener('mouseleave', stopResizing); // Handle mouse leaving window

        // Restore saved height
        const savedHeight = localStorage.getItem('previewHeight');
        if (savedHeight) {
            const height = parseFloat(savedHeight);
            previewSection.style.flex = `0 0 ${height}%`;
            bottomSection.style.flex = `0 0 ${100 - height}%`;
        }

        console.log('✅ Resizable divider initialized');
    },

    // ===== PHASE 6 FINAL: DEVICE TOGGLE =====

    initDeviceToggle() {
        const buttons = document.querySelectorAll('.device-toggle-btn');
        const previewContainer = document.querySelector('.preview-container');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all
                buttons.forEach(b => b.classList.remove('active'));

                // Add active to clicked
                btn.classList.add('active');

                // Update preview container class
                const device = btn.dataset.device; // desktop, tablet, or mobile
                previewContainer.className = `preview-container ${device}`;

                // Save preference
                localStorage.setItem('deviceView', device);
            });
        });

        // Restore saved device view
        const savedDevice = localStorage.getItem('deviceView') || 'desktop';
        const activeBtn = document.querySelector(`[data-device="${savedDevice}"]`);
        if (activeBtn) {
            buttons.forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
            previewContainer.className = `preview-container ${savedDevice}`;
        }

        console.log('✅ Device toggle initialized');
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());