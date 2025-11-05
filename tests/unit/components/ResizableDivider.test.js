/**
 * Unit Tests: ResizableDivider
 * Tests the resizable divider component
 */

// Mock console methods
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
global.localStorage = localStorageMock;

// Load components
const fs = require('fs');
const path = require('path');

// Load BaseComponent
const baseComponentPath = path.join(__dirname, '../../../public/js/components/BaseComponent.js');
let baseComponentCode = fs.readFileSync(baseComponentPath, 'utf-8');
baseComponentCode = baseComponentCode.replace('class BaseComponent {', 'global.BaseComponent = class BaseComponent {');
eval(baseComponentCode);

// Load ResizableDivider
const resizableDividerPath = path.join(__dirname, '../../../public/js/components/ResizableDivider.js');
let resizableDividerCode = fs.readFileSync(resizableDividerPath, 'utf-8');
resizableDividerCode = `const BaseComponent = global.BaseComponent;\n` + resizableDividerCode;
resizableDividerCode = resizableDividerCode.replace('class ResizableDivider extends BaseComponent {', 'global.ResizableDivider = class ResizableDivider extends BaseComponent {');
eval(resizableDividerCode);

const BaseComponent = global.BaseComponent;
const ResizableDivider = global.ResizableDivider;

describe('ResizableDivider', () => {
  let container;
  let divider;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.useFakeTimers();

    // Create container with required DOM structure
    container = document.createElement('div');
    container.className = 'app-container';
    container.innerHTML = `
      <div class="preview-section"></div>
      <div class="resizable-divider"></div>
      <div class="bottom-section"></div>
    `;
    document.body.appendChild(container);

    divider = container.querySelector('.resizable-divider');
  });

  afterEach(() => {
    jest.useRealTimers();

    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor & Initialization', () => {
    test('should initialize with default state', () => {
      const component = new ResizableDivider(divider);

      expect(component.state.isResizing).toBe(false);
      expect(component.state.previewHeight).toBe(60);
    });

    test('should set storage key', () => {
      const component = new ResizableDivider(divider);

      expect(component.storageKey).toBe('nitya_previewHeight');
    });

    test('should set throttle delay for performance', () => {
      const component = new ResizableDivider(divider);

      expect(component.throttleDelay).toBe(16); // ~60fps
    });

    test('should call init on construction', () => {
      const component = new ResizableDivider(divider);

      expect(component.previewSection).toBeTruthy();
      expect(component.bottomSection).toBeTruthy();
      expect(component.appContainer).toBeTruthy();
    });
  });

  describe('DOM Setup', () => {
    test('should find preview section', () => {
      const component = new ResizableDivider(divider);

      expect(component.previewSection).toBe(document.querySelector('.preview-section'));
    });

    test('should find bottom section', () => {
      const component = new ResizableDivider(divider);

      expect(component.bottomSection).toBe(document.querySelector('.bottom-section'));
    });

    test('should find app container', () => {
      const component = new ResizableDivider(divider);

      expect(component.appContainer).toBe(document.querySelector('.app-container'));
    });

    test('should throw error if preview section missing', () => {
      container.querySelector('.preview-section').remove();

      expect(() => new ResizableDivider(divider)).toThrow('Required sections not found');
    });

    test('should throw error if bottom section missing', () => {
      container.querySelector('.bottom-section').remove();

      expect(() => new ResizableDivider(divider)).toThrow('Required sections not found');
    });
  });

  describe('Mouse Enter/Leave Events', () => {
    test('should change background on mouse enter', () => {
      const component = new ResizableDivider(divider);

      component.handleMouseEnter();

      expect(divider.style.background).toBe('var(--primary-start)');
    });

    test('should reset background on mouse leave', () => {
      const component = new ResizableDivider(divider);

      component.handleMouseEnter();
      component.handleMouseLeave();

      expect(divider.style.background).toBe('');
    });

    test('should not change background when resizing', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;

      component.handleMouseEnter();

      expect(divider.style.background).not.toBe('var(--primary-start)');
    });
  });

  describe('Mouse Down Event', () => {
    test('should set isResizing state', () => {
      const component = new ResizableDivider(divider);

      const mouseEvent = new MouseEvent('mousedown');
      component.handleMouseDown(mouseEvent);

      expect(component.state.isResizing).toBe(true);
    });

    test('should change cursor to ns-resize', () => {
      const component = new ResizableDivider(divider);

      const mouseEvent = new MouseEvent('mousedown');
      component.handleMouseDown(mouseEvent);

      expect(document.body.style.cursor).toBe('ns-resize');
    });

    test('should disable user select', () => {
      const component = new ResizableDivider(divider);

      const mouseEvent = new MouseEvent('mousedown');
      component.handleMouseDown(mouseEvent);

      expect(document.body.style.userSelect).toBe('none');
    });

    test('should make divider more prominent', () => {
      const component = new ResizableDivider(divider);

      const mouseEvent = new MouseEvent('mousedown');
      component.handleMouseDown(mouseEvent);

      expect(divider.style.height).toBe('12px');
      expect(divider.style.background).toBe('var(--primary-end)');
    });
  });

  describe('Mouse Move Event (Resizing)', () => {
    test('should not resize when not in resizing state', () => {
      const component = new ResizableDivider(divider);
      const initialHeight = component.state.previewHeight;

      const moveEvent = new MouseEvent('mousemove', { clientY: 100 });
      component.handleMouseMove(moveEvent);

      expect(component.state.previewHeight).toBe(initialHeight);
    });

    test('should throttle updates for performance', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;

      // First move should work
      const moveEvent1 = new MouseEvent('mousemove', { clientY: 100 });
      component.handleMouseMove(moveEvent1);

      const height1 = component.state.previewHeight;

      // Immediate second move should be throttled
      const moveEvent2 = new MouseEvent('mousemove', { clientY: 200 });
      component.handleMouseMove(moveEvent2);

      const height2 = component.state.previewHeight;

      // Heights should be the same due to throttling
      expect(height2).toBe(height1);
    });

    test('should apply minimum constraint (25%)', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;

      // Mock container bounds
      jest.spyOn(component.appContainer, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        height: 1000
      });

      // Try to set very small height
      const moveEvent = new MouseEvent('mousemove', { clientY: 10 });
      component.handleMouseMove(moveEvent);

      jest.advanceTimersByTime(20);

      expect(component.state.previewHeight).toBeGreaterThanOrEqual(25);
    });

    test('should apply maximum constraint (85%)', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;

      // Mock container bounds
      jest.spyOn(component.appContainer, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        height: 1000
      });

      // Try to set very large height
      const moveEvent = new MouseEvent('mousemove', { clientY: 950 });
      component.handleMouseMove(moveEvent);

      jest.advanceTimersByTime(20);

      expect(component.state.previewHeight).toBeLessThanOrEqual(85);
    });
  });

  describe('Mouse Up Event', () => {
    test('should reset isResizing state', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;

      component.handleMouseUp();

      expect(component.state.isResizing).toBe(false);
    });

    test('should reset cursor', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;
      document.body.style.cursor = 'ns-resize';

      component.handleMouseUp();

      expect(document.body.style.cursor).toBe('default');
    });

    test('should reset user select', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;
      document.body.style.userSelect = 'none';

      component.handleMouseUp();

      expect(document.body.style.userSelect).toBe('');
    });

    test('should reset divider styles', () => {
      const component = new ResizableDivider(divider);
      component.state.isResizing = true;
      divider.style.background = 'var(--primary-end)';
      divider.style.height = '12px';

      component.handleMouseUp();

      expect(divider.style.background).toBe('');
      expect(divider.style.height).toBe('');
    });

    test('should not error when not resizing', () => {
      const component = new ResizableDivider(divider);

      expect(() => component.handleMouseUp()).not.toThrow();
    });
  });

  describe('Preview Height Management', () => {
    test('should set preview section flex', () => {
      const component = new ResizableDivider(divider);

      component.setPreviewHeight(70);

      expect(component.previewSection.style.flex).toBe('0 0 70%');
    });

    test('should set bottom section flex', () => {
      const component = new ResizableDivider(divider);

      component.setPreviewHeight(70);

      expect(component.bottomSection.style.flex).toBe('0 0 30%');
    });

    test('should update state', () => {
      const component = new ResizableDivider(divider);

      component.setPreviewHeight(75);

      expect(component.state.previewHeight).toBe(75);
    });

    test('should get current preview height', () => {
      const component = new ResizableDivider(divider);
      component.state.previewHeight = 65;

      expect(component.getPreviewHeight()).toBe(65);
    });

    test('should handle missing preview section', () => {
      const component = new ResizableDivider(divider);
      component.previewSection = null;

      expect(() => component.setPreviewHeight(70)).not.toThrow();
    });
  });

  describe('localStorage Persistence', () => {
    test('should call saveHeight through debounce', () => {
      const component = new ResizableDivider(divider);
      const saveHeightSpy = jest.spyOn(component, 'saveHeight');

      component.debounceSave(75);

      jest.advanceTimersByTime(200);

      expect(saveHeightSpy).toHaveBeenCalledWith(75);
    });

    test('should debounce multiple save calls', () => {
      const component = new ResizableDivider(divider);
      const saveHeightSpy = jest.spyOn(component, 'saveHeight');

      component.debounceSave(70);
      component.debounceSave(75);
      component.debounceSave(80);

      jest.advanceTimersByTime(200);

      // Should only save the last value
      expect(saveHeightSpy).toHaveBeenCalledTimes(1);
      expect(saveHeightSpy).toHaveBeenCalledWith(80);
    });

    test('should handle localStorage gracefully', () => {
      const component = new ResizableDivider(divider);

      expect(() => component.saveHeight(75)).not.toThrow();
      expect(() => component.restoreSavedHeight()).not.toThrow();
    });

    test('should call restoreSavedHeight during init', () => {
      const restoreSpy = jest.spyOn(ResizableDivider.prototype, 'restoreSavedHeight');

      new ResizableDivider(divider);

      expect(restoreSpy).toHaveBeenCalled();

      restoreSpy.mockRestore();
    });
  });

  describe('Programmatic Control', () => {
    test('should reset to default height', () => {
      const component = new ResizableDivider(divider);
      component.setPreviewHeight(75);

      component.resetHeight();

      expect(component.state.previewHeight).toBe(60);
    });

    test('should save default height on reset', () => {
      const component = new ResizableDivider(divider);
      const saveHeightSpy = jest.spyOn(component, 'saveHeight');

      component.resetHeight();

      expect(saveHeightSpy).toHaveBeenCalledWith(60);
    });
  });

  describe('Lifecycle', () => {
    test('should have empty render method', () => {
      const component = new ResizableDivider(divider);

      expect(() => component.render()).not.toThrow();
    });

    test('should clear timeout on destroy', () => {
      const component = new ResizableDivider(divider);
      component.debounceSave(75);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      component.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('should clean up references on destroy', () => {
      const component = new ResizableDivider(divider);

      component.destroy();

      expect(component.divider).toBeNull();
      expect(component.previewSection).toBeNull();
      expect(component.bottomSection).toBeNull();
      expect(component.appContainer).toBeNull();
    });

    test('should call parent destroy', () => {
      const component = new ResizableDivider(divider);

      component.destroy();

      expect(component.isDestroyed).toBe(true);
    });
  });

  describe('Inheritance', () => {
    test('should extend BaseComponent', () => {
      const component = new ResizableDivider(divider);

      expect(component).toBeInstanceOf(BaseComponent);
      expect(component).toBeInstanceOf(ResizableDivider);
    });

    test('should inherit BaseComponent methods', () => {
      const component = new ResizableDivider(divider);

      expect(typeof component.setState).toBe('function');
      expect(typeof component.on).toBe('function');
      expect(typeof component.emit).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });
  });
});
