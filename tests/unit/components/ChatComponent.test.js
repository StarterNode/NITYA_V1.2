/**
 * Unit Tests: ChatComponent
 * Tests the chat interface component
 */

// Mock console methods
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Load components
const fs = require('fs');
const path = require('path');

// Load BaseComponent first and make it globally available
const baseComponentPath = path.join(__dirname, '../../../public/js/components/BaseComponent.js');
let baseComponentCode = fs.readFileSync(baseComponentPath, 'utf-8');
baseComponentCode = baseComponentCode.replace('class BaseComponent {', 'global.BaseComponent = class BaseComponent {');
eval(baseComponentCode);

// Now load ChatComponent (BaseComponent is available in global scope)
const chatComponentPath = path.join(__dirname, '../../../public/js/components/ChatComponent.js');
let chatComponentCode = fs.readFileSync(chatComponentPath, 'utf-8');
// Inject BaseComponent reference before the class declaration
chatComponentCode = `const BaseComponent = global.BaseComponent;\n` + chatComponentCode;
chatComponentCode = chatComponentCode.replace('class ChatComponent extends BaseComponent {', 'global.ChatComponent = class ChatComponent extends BaseComponent {');
eval(chatComponentCode);

const BaseComponent = global.BaseComponent;
const ChatComponent = global.ChatComponent;

describe('ChatComponent', () => {
  let container;
  let mockChatService;
  let mockMessageService;

  beforeEach(() => {
    // Clear console mocks
    jest.clearAllMocks();

    // Create container with required DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <div id="messages"></div>
      <textarea id="user-input"></textarea>
      <button id="send-btn">Send</button>
      <input type="file" id="file-input" />
    `;
    document.body.appendChild(container);

    // Create mock services
    mockChatService = {
      sendMessage: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'AI response' }] }),
      extractMessageText: jest.fn((response) => response.content[0].text)
    };

    mockMessageService = {
      addMessage: jest.fn(),
      getMessages: jest.fn().mockReturnValue([]),
      clearMessages: jest.fn()
    };
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor & Dependencies', () => {
    test('should throw error without chatService', () => {
      expect(() => new ChatComponent(container, {
        messageService: mockMessageService
      })).toThrow('ChatComponent requires chatService');
    });

    test('should throw error without messageService', () => {
      expect(() => new ChatComponent(container, {
        chatService: mockChatService
      })).toThrow('ChatComponent requires messageService');
    });

    test('should initialize with required dependencies', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(component.chatService).toBe(mockChatService);
      expect(component.messageService).toBe(mockMessageService);
    });

    test('should initialize with default state', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(component.state.isTyping).toBe(false);
      expect(component.state.isSending).toBe(false);
    });

    test('should call init on construction', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(component.messagesContainer).toBeTruthy();
      expect(component.chatInput).toBeTruthy();
      expect(component.sendButton).toBeTruthy();
    });
  });

  describe('DOM Setup', () => {
    test('should find required DOM elements', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(component.messagesContainer).toBe(document.getElementById('messages'));
      expect(component.chatInput).toBe(document.getElementById('user-input'));
      expect(component.sendButton).toBe(document.getElementById('send-btn'));
      expect(component.fileInput).toBe(document.getElementById('file-input'));
    });

    test('should throw error if messages container missing', () => {
      container.innerHTML = '<textarea id="user-input"></textarea><button id="send-btn"></button>';

      expect(() => new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      })).toThrow('Required chat DOM elements not found');
    });

    test('should throw error if input field missing', () => {
      container.innerHTML = '<div id="messages"></div><button id="send-btn"></button>';

      expect(() => new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      })).toThrow('Required chat DOM elements not found');
    });

    test('should throw error if send button missing', () => {
      container.innerHTML = '<div id="messages"></div><textarea id="user-input"></textarea>';

      expect(() => new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      })).toThrow('Required chat DOM elements not found');
    });
  });

  describe('Event Listeners', () => {
    test('should send message on button click', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Test message';
      component.sendButton.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test message');
    });

    test('should send message on Enter key', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Enter message';

      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', shiftKey: false });
      component.chatInput.dispatchEvent(enterEvent);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Enter message');
    });

    test('should not send on Shift+Enter', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Multi\nline';

      const shiftEnterEvent = new KeyboardEvent('keypress', { key: 'Enter', shiftKey: true });
      component.chatInput.dispatchEvent(shiftEnterEvent);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    test('should auto-resize textarea on input', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Line 1\nLine 2\nLine 3';
      component.chatInput.dispatchEvent(new Event('input'));

      // Should set height to scrollHeight
      expect(component.chatInput.style.height).toBeTruthy();
    });
  });

  describe('Message Rendering', () => {
    test('should render messages from message service', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello' },
        { role: 'ai', content: 'Hi there!' }
      ]);

      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const messages = component.messagesContainer.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });

    test('should render user message with avatar', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const avatar = document.querySelector('.message-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar.textContent).toBe('U');
    });

    test('should render AI message with avatar', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'ai', content: 'Hello' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const avatar = document.querySelector('.message-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar.textContent).toBe('N');
    });

    test('should render system message without avatar', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'system', content: 'System message' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const avatar = document.querySelector('.message-avatar');
      expect(avatar).toBeNull();
    });

    test('should render message content', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'user', content: 'Test content' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(document.querySelector('.message-bubble').innerHTML).toContain('Test content');
    });

    test('should convert newlines to <br> tags', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'user', content: 'Line 1\nLine 2' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(document.querySelector('.message-bubble').innerHTML).toContain('<br>');
    });

    test('should render preview tags as inline preview', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'ai', content: '[PREVIEW: section=hero]<div>Hero</div>[/PREVIEW]' }
      ]);

      new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const preview = document.querySelector('.inline-preview');
      expect(preview).toBeTruthy();
      expect(preview.querySelector('.inline-preview-label').textContent).toContain('HERO');
      expect(preview.querySelector('.inline-preview-content').innerHTML).toContain('<div>Hero</div>');
    });
  });

  describe('Sending Messages', () => {
    test('should not send empty message', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = '';
      await component.handleSendClick();

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    test('should not send while already sending', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.state.isSending = true;
      component.chatInput.value = 'Test';
      await component.handleSendClick();

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    test('should update isSending state', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Test';
      const sendPromise = component.handleSendClick();

      expect(component.state.isSending).toBe(true);

      await sendPromise;

      expect(component.state.isSending).toBe(false);
    });

    test('should clear input after sending', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Test message';
      await component.handleSendClick();

      expect(component.chatInput.value).toBe('');
    });

    test('should show typing indicator while waiting', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Test';
      const sendPromise = component.handleSendClick();

      // Typing indicator should be visible
      expect(document.getElementById('typing')).toBeTruthy();

      await sendPromise;

      // Should be hidden after response
      expect(document.getElementById('typing')).toBeNull();
    });

    test('should emit messageSent event', async () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      const handler = jest.fn();
      component.on('messageSent', handler);

      component.chatInput.value = 'Test';
      await component.handleSendClick();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].userMessage).toBe('Test');
      expect(handler.mock.calls[0][0].aiMessage).toBe('AI response');
    });

    test('should handle send error gracefully', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('Network error'));

      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.chatInput.value = 'Test';
      await component.handleSendClick();

      // Should add error message
      expect(mockMessageService.addMessage).toHaveBeenCalledWith('system', 'Error: Network error');
      expect(component.state.isSending).toBe(false);
    });
  });

  describe('Message Management', () => {
    test('should add message to service and render', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.addMessage('user', 'Test message');

      expect(mockMessageService.addMessage).toHaveBeenCalledWith('user', 'Test message');
    });

    test('should clear all messages', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.clearMessages();

      expect(mockMessageService.clearMessages).toHaveBeenCalled();
    });
  });

  describe('UI Helpers', () => {
    test('should scroll to bottom', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.scrollToBottom();

      expect(component.messagesContainer.scrollTop).toBe(component.messagesContainer.scrollHeight);
    });

    test('should focus input field', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.focus();

      expect(document.activeElement).toBe(component.chatInput);
    });

    test('showTypingIndicator should create typing element', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.showTypingIndicator();

      const typing = document.getElementById('typing');
      expect(typing).toBeTruthy();
      expect(typing.className).toBe('typing-indicator');
      expect(component.state.isTyping).toBe(true);
    });

    test('showTypingIndicator should be idempotent', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.showTypingIndicator();
      component.showTypingIndicator();

      const typingElements = document.querySelectorAll('#typing');
      expect(typingElements.length).toBe(1);
    });

    test('hideTypingIndicator should remove typing element', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.showTypingIndicator();
      component.hideTypingIndicator();

      expect(document.getElementById('typing')).toBeNull();
      expect(component.state.isTyping).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    test('should clean up references on destroy', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.destroy();

      expect(component.messagesContainer).toBeNull();
      expect(component.chatInput).toBeNull();
      expect(component.sendButton).toBeNull();
      expect(component.fileInput).toBeNull();
    });

    test('should not render when destroyed', () => {
      mockMessageService.getMessages.mockReturnValue([
        { role: 'user', content: 'Test' }
      ]);

      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      component.destroy();
      component.render();

      // Render should exit early, not modify DOM
      expect(component.isDestroyed).toBe(true);
    });
  });

  describe('Inheritance', () => {
    test('should extend BaseComponent', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(component).toBeInstanceOf(BaseComponent);
      expect(component).toBeInstanceOf(ChatComponent);
    });

    test('should inherit BaseComponent methods', () => {
      const component = new ChatComponent(container, {
        chatService: mockChatService,
        messageService: mockMessageService
      });

      expect(typeof component.setState).toBe('function');
      expect(typeof component.on).toBe('function');
      expect(typeof component.emit).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });
  });
});
