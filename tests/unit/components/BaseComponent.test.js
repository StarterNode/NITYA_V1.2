/**
 * Unit Tests: BaseComponent
 * Tests the abstract base component class
 */

// Mock console methods to avoid test output noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Load BaseComponent (browser-style script)
const fs = require('fs');
const path = require('path');
const componentPath = path.join(__dirname, '../../../public/js/components/BaseComponent.js');
let componentCode = fs.readFileSync(componentPath, 'utf-8');

// Wrap the code to export the class
// Replace the class declaration to assign it to a variable we can access
componentCode = componentCode.replace('class BaseComponent {', 'global.BaseComponent = class BaseComponent {');

// Execute the modified code
eval(componentCode);

// BaseComponent should now be available
const BaseComponent = global.BaseComponent;

describe('BaseComponent', () => {
  let container;

  beforeEach(() => {
    // Create fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);

    // Clear console mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor', () => {
    test('should throw error without container', () => {
      expect(() => new BaseComponent(null)).toThrow('BaseComponent requires a container element');
    });

    test('should throw error with undefined container', () => {
      expect(() => new BaseComponent(undefined)).toThrow('BaseComponent requires a container element');
    });

    test('should initialize with container', () => {
      const component = new BaseComponent(container);

      expect(component.container).toBe(container);
      expect(component.options).toEqual({});
      expect(component.state).toEqual({});
      expect(component.eventHandlers).toBeInstanceOf(Map);
      expect(component.isDestroyed).toBe(false);
    });

    test('should accept options', () => {
      const options = { foo: 'bar', num: 42 };
      const component = new BaseComponent(container, options);

      expect(component.options).toEqual(options);
    });

    test('should bind methods to instance', () => {
      const component = new BaseComponent(container);
      const { render, setState, destroy } = component;

      // Methods should be bound (won't throw when called without context)
      expect(typeof render).toBe('function');
      expect(typeof setState).toBe('function');
      expect(typeof destroy).toBe('function');
    });

    test('should initialize empty eventHandlers Map', () => {
      const component = new BaseComponent(container);

      expect(component.eventHandlers).toBeInstanceOf(Map);
      expect(component.eventHandlers.size).toBe(0);
    });
  });

  describe('State Management', () => {
    test('should merge state with setState', () => {
      const component = new BaseComponent(container);
      component.render = jest.fn(); // Mock render to avoid abstract method error

      component.state = { a: 1, b: 2 };
      component.setState({ b: 3, c: 4 });

      expect(component.state).toEqual({ a: 1, b: 3, c: 4 });
    });

    test('should call onStateChange hook', () => {
      const component = new BaseComponent(container);
      component.onStateChange = jest.fn();
      component.render = jest.fn(); // Mock render to avoid error

      component.state = { a: 1 };
      component.setState({ b: 2 });

      expect(component.onStateChange).toHaveBeenCalledWith(
        { a: 1 },
        { a: 1, b: 2 }
      );
    });

    test('should call render after setState', () => {
      const component = new BaseComponent(container);
      component.render = jest.fn();

      component.setState({ foo: 'bar' });

      expect(component.render).toHaveBeenCalled();
    });

    test('should not setState when destroyed', () => {
      const component = new BaseComponent(container);
      component.render = jest.fn();
      component.destroy();

      component.setState({ foo: 'bar' });

      expect(component.render).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Cannot setState on destroyed component');
    });

    test('should not mutate old state', () => {
      const component = new BaseComponent(container);
      component.render = jest.fn();

      const initialState = { a: 1, b: 2 };
      component.state = { ...initialState };

      component.setState({ b: 3 });

      expect(initialState).toEqual({ a: 1, b: 2 }); // Original unchanged
    });

    test('onStateChange should be overridable', () => {
      const component = new BaseComponent(container);
      const customHook = jest.fn();
      component.onStateChange = customHook;
      component.render = jest.fn();

      component.setState({ test: true });

      expect(customHook).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    test('should register event handler with on()', () => {
      const component = new BaseComponent(container);
      const handler = jest.fn();

      component.on('test', handler);

      expect(component.eventHandlers.has('test')).toBe(true);
      expect(component.eventHandlers.get('test')).toContain(handler);
    });

    test('should register multiple handlers for same event', () => {
      const component = new BaseComponent(container);
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      component.on('test', handler1);
      component.on('test', handler2);

      expect(component.eventHandlers.get('test').length).toBe(2);
    });

    test('should emit event to registered handlers', () => {
      const component = new BaseComponent(container);
      const handler = jest.fn();

      component.on('test', handler);
      component.emit('test', { data: 'value' });

      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    test('should emit to all registered handlers', () => {
      const component = new BaseComponent(container);
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      component.on('test', handler1);
      component.on('test', handler2);
      component.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    test('should not error when emitting non-existent event', () => {
      const component = new BaseComponent(container);

      expect(() => component.emit('nonexistent')).not.toThrow();
    });

    test('should handle errors in event handlers', () => {
      const component = new BaseComponent(container);
      const badHandler = jest.fn(() => { throw new Error('Handler error'); });
      const goodHandler = jest.fn();

      component.on('test', badHandler);
      component.on('test', goodHandler);

      component.emit('test');

      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled(); // Should still run
      expect(console.error).toHaveBeenCalled();
    });

    test('should unregister handler with off()', () => {
      const component = new BaseComponent(container);
      const handler = jest.fn();

      component.on('test', handler);
      component.off('test', handler);
      component.emit('test');

      expect(handler).not.toHaveBeenCalled();
    });

    test('should not error when removing non-existent handler', () => {
      const component = new BaseComponent(container);
      const handler = jest.fn();

      expect(() => component.off('test', handler)).not.toThrow();
    });

    test('should only remove specific handler', () => {
      const component = new BaseComponent(container);
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      component.on('test', handler1);
      component.on('test', handler2);
      component.off('test', handler1);
      component.emit('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('DOM Helpers', () => {
    test('$() should find element by selector', () => {
      container.innerHTML = '<div class="test">Content</div>';
      const component = new BaseComponent(container);

      const element = component.$('.test');

      expect(element).toBeTruthy();
      expect(element.textContent).toBe('Content');
    });

    test('$() should return null if not found', () => {
      const component = new BaseComponent(container);

      const element = component.$('.nonexistent');

      expect(element).toBeNull();
    });

    test('$$() should find all elements by selector', () => {
      container.innerHTML = '<div class="test"></div><div class="test"></div>';
      const component = new BaseComponent(container);

      const elements = component.$$('.test');

      expect(elements.length).toBe(2);
    });

    test('$$() should return empty NodeList if not found', () => {
      const component = new BaseComponent(container);

      const elements = component.$$('.nonexistent');

      expect(elements.length).toBe(0);
    });

    test('$() should only search within container', () => {
      const outsideDiv = document.createElement('div');
      outsideDiv.className = 'outside';
      document.body.appendChild(outsideDiv);

      container.innerHTML = '<div class="inside"></div>';
      const component = new BaseComponent(container);

      expect(component.$('.inside')).toBeTruthy();
      expect(component.$('.outside')).toBeNull();

      document.body.removeChild(outsideDiv);
    });
  });

  describe('Lifecycle Methods', () => {
    test('render() should throw error (abstract method)', () => {
      const component = new BaseComponent(container);

      expect(() => component.render()).toThrow('BaseComponent.render() must be implemented by subclass');
    });

    test('init() should be overridable', () => {
      const component = new BaseComponent(container);

      // Default init does nothing
      expect(() => component.init()).not.toThrow();
    });

    test('destroy() should clear event handlers', () => {
      const component = new BaseComponent(container);
      component.on('test', jest.fn());

      component.destroy();

      expect(component.eventHandlers.size).toBe(0);
    });

    test('destroy() should clear container HTML', () => {
      container.innerHTML = '<div>Content</div>';
      const component = new BaseComponent(container);

      component.destroy();

      expect(container.innerHTML).toBe('');
    });

    test('destroy() should mark component as destroyed', () => {
      const component = new BaseComponent(container);

      component.destroy();

      expect(component.isDestroyed).toBe(true);
    });

    test('destroy() should be idempotent', () => {
      const component = new BaseComponent(container);

      component.destroy();
      component.destroy(); // Second call should not error

      expect(component.isDestroyed).toBe(true);
    });

    test('destroy() should log message', () => {
      const component = new BaseComponent(container);

      component.destroy();

      expect(console.log).toHaveBeenCalledWith('BaseComponent destroyed');
    });
  });

  describe('Utility Methods', () => {
    test('getName() should return constructor name', () => {
      const component = new BaseComponent(container);

      expect(component.getName()).toBe('BaseComponent');
    });

    test('log() should log with component prefix', () => {
      const component = new BaseComponent(container);

      component.log('Test message');

      expect(console.log).toHaveBeenCalledWith('[BaseComponent]', 'Test message');
    });

    test('log() should log with data', () => {
      const component = new BaseComponent(container);
      const data = { foo: 'bar' };

      component.log('Test message', data);

      expect(console.log).toHaveBeenCalledWith('[BaseComponent]', 'Test message', data);
    });

    test('error() should log error with component prefix', () => {
      const component = new BaseComponent(container);

      component.error('Error message');

      expect(console.error).toHaveBeenCalledWith('[BaseComponent]', 'Error message');
    });

    test('error() should log with error object', () => {
      const component = new BaseComponent(container);
      const error = new Error('Test error');

      component.error('Error occurred', error);

      expect(console.error).toHaveBeenCalledWith('[BaseComponent]', 'Error occurred', error);
    });
  });

  describe('Inheritance Pattern', () => {
    test('should be extendable by subclasses', () => {
      class TestComponent extends BaseComponent {
        render() {
          this.container.innerHTML = '<div>Test</div>';
        }
      }

      const component = new TestComponent(container);
      component.render();

      expect(container.innerHTML).toBe('<div>Test</div>');
    });

    test('subclass should inherit all methods', () => {
      class TestComponent extends BaseComponent {
        render() {}
      }

      const component = new TestComponent(container);

      expect(typeof component.setState).toBe('function');
      expect(typeof component.on).toBe('function');
      expect(typeof component.emit).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });

    test('subclass getName() should return subclass name', () => {
      class CustomComponent extends BaseComponent {
        render() {}
      }

      const component = new CustomComponent(container);

      expect(component.getName()).toBe('CustomComponent');
    });
  });
});
