/**
 * Unit Tests: PreviewComponent
 * Tests the preview iframe management component
 */

// Mock console methods
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Load components
const fs = require('fs');
const path = require('path');

// Load BaseComponent
const baseComponentPath = path.join(__dirname, '../../../public/js/components/BaseComponent.js');
let baseComponentCode = fs.readFileSync(baseComponentPath, 'utf-8');
baseComponentCode = baseComponentCode.replace('class BaseComponent {', 'global.BaseComponent = class BaseComponent {');
eval(baseComponentCode);

// Load PreviewComponent
const previewComponentPath = path.join(__dirname, '../../../public/js/components/PreviewComponent.js');
let previewComponentCode = fs.readFileSync(previewComponentPath, 'utf-8');
previewComponentCode = `const BaseComponent = global.BaseComponent;\n` + previewComponentCode;
previewComponentCode = previewComponentCode.replace('class PreviewComponent extends BaseComponent {', 'global.PreviewComponent = class PreviewComponent extends BaseComponent {');
eval(previewComponentCode);

const BaseComponent = global.BaseComponent;
const PreviewComponent = global.PreviewComponent;

describe('PreviewComponent', () => {
  let container;
  let config;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Create container with required DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <iframe id="preview-iframe" src="about:blank"></iframe>
      <div class="approval-controls" style="display: none;"></div>
    `;
    document.body.appendChild(container);

    // Default config
    config = {
      apiUrl: 'http://localhost:3000',
      userId: 'test_user_123'
    };
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor & Dependencies', () => {
    test('should throw error without apiUrl', () => {
      expect(() => new PreviewComponent(container, {
        userId: 'test_user'
      })).toThrow('PreviewComponent requires apiUrl');
    });

    test('should throw error without userId', () => {
      expect(() => new PreviewComponent(container, {
        apiUrl: 'http://localhost:3000'
      })).toThrow('PreviewComponent requires userId');
    });

    test('should initialize with required config', () => {
      const component = new PreviewComponent(container, config);

      expect(component.apiUrl).toBe('http://localhost:3000');
      expect(component.userId).toBe('test_user_123');
    });

    test('should initialize with default state', () => {
      const component = new PreviewComponent(container, config);

      expect(component.state.lastPreviewedSection).toBeNull();
      expect(component.state.lastPreviewedHtml).toBeNull();
      expect(component.state.isLoading).toBe(false);
    });

    test('should call init on construction', () => {
      const component = new PreviewComponent(container, config);

      expect(component.previewIframe).toBeTruthy();
    });
  });

  describe('DOM Setup', () => {
    test('should find preview iframe', () => {
      const component = new PreviewComponent(container, config);

      expect(component.previewIframe).toBe(document.getElementById('preview-iframe'));
    });

    test('should find approval controls', () => {
      const component = new PreviewComponent(container, config);

      expect(component.approvalControls).toBe(document.querySelector('.approval-controls'));
    });

    test('should throw error if preview iframe missing', () => {
      container.innerHTML = '<div class="approval-controls"></div>';

      expect(() => new PreviewComponent(container, config)).toThrow('Preview iframe not found');
    });

    test('should handle missing approval controls gracefully', () => {
      container.innerHTML = '<iframe id="preview-iframe"></iframe>';

      const component = new PreviewComponent(container, config);

      expect(component.approvalControls).toBeNull();
      expect(() => component.showApprovalButtons()).not.toThrow();
    });
  });

  describe('Fileviewer postMessage Handling', () => {
    test('should listen for window messages', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      new PreviewComponent(container, config);

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    test('should emit fileUploaded event on FILE_UPLOADED message', () => {
      const component = new PreviewComponent(container, config);
      const handler = jest.fn();
      component.on('fileUploaded', handler);

      const messageEvent = new MessageEvent('message', {
        data: { type: 'FILE_UPLOADED', filename: 'test.jpg' }
      });
      window.dispatchEvent(messageEvent);

      expect(handler).toHaveBeenCalledWith('test.jpg');
    });

    test('should emit fileDeleted event on FILE_DELETED message', () => {
      const component = new PreviewComponent(container, config);
      const handler = jest.fn();
      component.on('fileDeleted', handler);

      const messageEvent = new MessageEvent('message', {
        data: { type: 'FILE_DELETED', filename: 'old.jpg' }
      });
      window.dispatchEvent(messageEvent);

      expect(handler).toHaveBeenCalledWith('old.jpg');
    });

    test('should emit fileSelected event on FILE_SELECTED message', () => {
      const component = new PreviewComponent(container, config);
      const handler = jest.fn();
      component.on('fileSelected', handler);

      const messageEvent = new MessageEvent('message', {
        data: { type: 'FILE_SELECTED', filename: 'selected.jpg' }
      });
      window.dispatchEvent(messageEvent);

      expect(handler).toHaveBeenCalledWith('selected.jpg');
    });

    test('should ignore messages without type', () => {
      const component = new PreviewComponent(container, config);
      const handler = jest.fn();
      component.on('fileSelected', handler);

      const messageEvent = new MessageEvent('message', {
        data: { filename: 'test.jpg' } // No type
      });
      window.dispatchEvent(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should ignore messages with unknown type', () => {
      const component = new PreviewComponent(container, config);

      const messageEvent = new MessageEvent('message', {
        data: { type: 'UNKNOWN_TYPE', data: 'test' }
      });

      expect(() => window.dispatchEvent(messageEvent)).not.toThrow();
    });

    test('should ignore null/undefined message data', () => {
      const component = new PreviewComponent(container, config);

      const messageEvent1 = new MessageEvent('message', { data: null });
      const messageEvent2 = new MessageEvent('message', { data: undefined });

      expect(() => {
        window.dispatchEvent(messageEvent1);
        window.dispatchEvent(messageEvent2);
      }).not.toThrow();
    });
  });

  describe('Update Preview', () => {
    beforeEach(() => {
      // Mock successful fetch response
      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true })
      });
    });

    test('should update state with section and HTML', async () => {
      const component = new PreviewComponent(container, config);

      const promise = component.updatePreview('hero', '<div>Hero HTML</div>');

      // Check state during loading
      expect(component.state.lastPreviewedSection).toBe('hero');
      expect(component.state.lastPreviewedHtml).toBe('<div>Hero HTML</div>');
      expect(component.state.isLoading).toBe(true);

      await promise;

      expect(component.state.isLoading).toBe(false);
    });

    test('should POST to update-preview endpoint', async () => {
      const component = new PreviewComponent(container, config);

      await component.updatePreview('about', '<div>About HTML</div>');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/update-preview',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'test_user_123',
            section: 'about',
            html: '<div>About HTML</div>'
          })
        })
      );
    });

    test('should refresh preview after successful update', async () => {
      jest.useFakeTimers();

      const component = new PreviewComponent(container, config);
      const originalSrc = component.previewIframe.src;

      await component.updatePreview('hero', '<div>Hero</div>');

      // Fast-forward timer for refresh delay
      jest.advanceTimersByTime(300);

      // Should have cache-busting timestamp
      expect(component.previewIframe.src).toContain('?t=');
      expect(component.previewIframe.src).not.toBe(originalSrc);

      jest.useRealTimers();
    });

    test('should show approval buttons after update', async () => {
      const component = new PreviewComponent(container, config);

      await component.updatePreview('hero', '<div>Hero</div>');

      expect(component.approvalControls.style.display).toBe('flex');
    });

    test('should return API response', async () => {
      const component = new PreviewComponent(container, config);

      const result = await component.updatePreview('hero', '<div>Hero</div>');

      expect(result).toEqual({ success: true });
    });

    test('should handle update error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const component = new PreviewComponent(container, config);

      await expect(component.updatePreview('hero', '<div>Hero</div>'))
        .rejects.toThrow('Network error');

      expect(component.state.isLoading).toBe(false);
    });

    test('should handle failed response', async () => {
      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: false, error: 'Invalid HTML' })
      });

      const component = new PreviewComponent(container, config);

      const result = await component.updatePreview('hero', '<div>Hero</div>');

      expect(result.success).toBe(false);
    });
  });

  describe('Clear Preview', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true })
      });
    });

    test('should POST to clear endpoint', async () => {
      const component = new PreviewComponent(container, config);

      await component.clearPreview();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/update-preview/clear',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'test_user_123'
          })
        })
      );
    });

    test('should clear state', async () => {
      const component = new PreviewComponent(container, config);

      // Set some state first
      component.state.lastPreviewedSection = 'hero';
      component.state.lastPreviewedHtml = '<div>Hero</div>';

      await component.clearPreview();

      expect(component.state.lastPreviewedSection).toBeNull();
      expect(component.state.lastPreviewedHtml).toBeNull();
    });

    test('should hide approval buttons', async () => {
      const component = new PreviewComponent(container, config);

      component.approvalControls.style.display = 'flex';

      await component.clearPreview();

      expect(component.approvalControls.style.display).toBe('none');
    });

    test('should refresh preview', async () => {
      jest.useFakeTimers();

      const component = new PreviewComponent(container, config);
      const originalSrc = component.previewIframe.src;

      await component.clearPreview();

      jest.advanceTimersByTime(300);

      expect(component.previewIframe.src).not.toBe(originalSrc);

      jest.useRealTimers();
    });

    test('should handle clear error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const component = new PreviewComponent(container, config);

      await expect(component.clearPreview()).rejects.toThrow('Network error');
    });
  });

  describe('Refresh Preview', () => {
    test('should reload iframe with cache-busting', () => {
      jest.useFakeTimers();

      const component = new PreviewComponent(container, config);
      component.previewIframe.src = 'http://localhost:3000/preview.html';

      component.refreshPreview();

      jest.advanceTimersByTime(300);

      expect(component.previewIframe.src).toContain('http://localhost:3000/preview.html?t=');

      jest.useRealTimers();
    });

    test('should strip existing query params', () => {
      jest.useFakeTimers();

      const component = new PreviewComponent(container, config);
      component.previewIframe.src = 'http://localhost:3000/preview.html?old=param';

      component.refreshPreview();

      jest.advanceTimersByTime(300);

      expect(component.previewIframe.src).not.toContain('old=param');
      expect(component.previewIframe.src).toContain('?t=');

      jest.useRealTimers();
    });

    test('should handle missing iframe gracefully', () => {
      const component = new PreviewComponent(container, config);
      component.previewIframe = null;

      expect(() => component.refreshPreview()).not.toThrow();
    });
  });

  describe('Approval Buttons', () => {
    test('should show approval buttons', () => {
      const component = new PreviewComponent(container, config);

      component.showApprovalButtons();

      expect(component.approvalControls.style.display).toBe('flex');
    });

    test('should hide approval buttons', () => {
      const component = new PreviewComponent(container, config);

      component.approvalControls.style.display = 'flex';
      component.hideApprovalButtons();

      expect(component.approvalControls.style.display).toBe('none');
    });

    test('should handle missing approval controls in show', () => {
      const component = new PreviewComponent(container, config);
      component.approvalControls = null;

      expect(() => component.showApprovalButtons()).not.toThrow();
    });

    test('should handle missing approval controls in hide', () => {
      const component = new PreviewComponent(container, config);
      component.approvalControls = null;

      expect(() => component.hideApprovalButtons()).not.toThrow();
    });
  });

  describe('Generate Final Index', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true })
      });
    });

    test('should POST to generate-index endpoint', async () => {
      const component = new PreviewComponent(container, config);
      const html = '<!DOCTYPE html><html><body>Final</body></html>';

      await component.generateFinalIndex(html);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate-index',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'test_user_123',
            html: html
          })
        })
      );
    });

    test('should switch iframe to index.html', async () => {
      const component = new PreviewComponent(container, config);

      await component.generateFinalIndex('<html></html>');

      expect(component.previewIframe.src).toContain('/prospects/test_user_123/index.html');
      expect(component.previewIframe.src).toContain('?t=');
    });

    test('should hide approval buttons', async () => {
      const component = new PreviewComponent(container, config);
      component.approvalControls.style.display = 'flex';

      await component.generateFinalIndex('<html></html>');

      expect(component.approvalControls.style.display).toBe('none');
    });

    test('should emit indexGenerated event', async () => {
      const component = new PreviewComponent(container, config);
      const handler = jest.fn();
      component.on('indexGenerated', handler);

      await component.generateFinalIndex('<html></html>');

      expect(handler).toHaveBeenCalled();
    });

    test('should handle generation error', async () => {
      global.fetch.mockRejectedValue(new Error('Write error'));

      const component = new PreviewComponent(container, config);

      await expect(component.generateFinalIndex('<html></html>'))
        .rejects.toThrow('Write error');
    });
  });

  describe('Lifecycle', () => {
    test('should have empty render method', () => {
      const component = new PreviewComponent(container, config);

      expect(() => component.render()).not.toThrow();
    });

    test('should clean up references on destroy', () => {
      const component = new PreviewComponent(container, config);

      component.destroy();

      expect(component.previewIframe).toBeNull();
      expect(component.approvalControls).toBeNull();
    });

    test('should call parent destroy', () => {
      const component = new PreviewComponent(container, config);

      component.destroy();

      expect(component.isDestroyed).toBe(true);
    });
  });

  describe('Inheritance', () => {
    test('should extend BaseComponent', () => {
      const component = new PreviewComponent(container, config);

      expect(component).toBeInstanceOf(BaseComponent);
      expect(component).toBeInstanceOf(PreviewComponent);
    });

    test('should inherit BaseComponent methods', () => {
      const component = new PreviewComponent(container, config);

      expect(typeof component.setState).toBe('function');
      expect(typeof component.on).toBe('function');
      expect(typeof component.emit).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });
  });
});
