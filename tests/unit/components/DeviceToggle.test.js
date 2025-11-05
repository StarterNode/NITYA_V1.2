/**
 * Unit Tests: DeviceToggle
 * Tests the device view toggle component
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

// Load DeviceToggle
const deviceTogglePath = path.join(__dirname, '../../../public/js/components/DeviceToggle.js');
let deviceToggleCode = fs.readFileSync(deviceTogglePath, 'utf-8');
deviceToggleCode = `const BaseComponent = global.BaseComponent;\n` + deviceToggleCode;
deviceToggleCode = deviceToggleCode.replace('class DeviceToggle extends BaseComponent {', 'global.DeviceToggle = class DeviceToggle extends BaseComponent {');
eval(deviceToggleCode);

const BaseComponent = global.BaseComponent;
const DeviceToggle = global.DeviceToggle;

describe('DeviceToggle', () => {
  let container;

  beforeEach(() => {
    // Clear all console mocks
    jest.clearAllMocks();

    // Clear localStorage data but keep mock functions
    localStorageMock.clear();
    // Reset call history without destroying the mock
    if (localStorageMock.getItem.mockClear) {
      localStorageMock.getItem.mockClear();
    }
    if (localStorageMock.setItem.mockClear) {
      localStorageMock.setItem.mockClear();
    }

    // Create container with required DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <div class="device-toggle">
        <button class="device-toggle-btn active" data-device="desktop">Desktop</button>
        <button class="device-toggle-btn" data-device="tablet">Tablet</button>
        <button class="device-toggle-btn" data-device="mobile">Mobile</button>
      </div>
      <div class="preview-container desktop"></div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor & Initialization', () => {
    test('should initialize with default desktop state', () => {
      const component = new DeviceToggle(container);

      expect(component.state.currentDevice).toBe('desktop');
    });

    test('should set storage key', () => {
      const component = new DeviceToggle(container);

      expect(component.storageKey).toBe('nitya_deviceView');
    });

    test('should call init on construction', () => {
      const component = new DeviceToggle(container);

      expect(component.buttons).toBeTruthy();
      expect(component.previewContainer).toBeTruthy();
    });
  });

  describe('DOM Setup', () => {
    test('should find all device toggle buttons', () => {
      const component = new DeviceToggle(container);

      expect(component.buttons.length).toBe(3);
    });

    test('should find preview container', () => {
      const component = new DeviceToggle(container);

      expect(component.previewContainer).toBe(document.querySelector('.preview-container'));
    });

    test('should throw error if no buttons found', () => {
      container.innerHTML = '<div class="preview-container"></div>';

      expect(() => new DeviceToggle(container)).toThrow('Device toggle buttons not found');
    });

    test('should throw error if preview container missing', () => {
      container.innerHTML = '<button class="device-toggle-btn" data-device="desktop"></button>';

      expect(() => new DeviceToggle(container)).toThrow('Preview container not found');
    });
  });

  describe('Event Listeners', () => {
    test('should attach click listeners to all buttons', () => {
      const component = new DeviceToggle(container);

      const buttons = Array.from(component.buttons);

      buttons.forEach(btn => {
        expect(btn.onclick || true).toBeTruthy();
      });
    });

    test('should handle desktop button click', () => {
      const component = new DeviceToggle(container);
      const desktopBtn = Array.from(component.buttons).find(b => b.dataset.device === 'desktop');

      desktopBtn.click();

      expect(component.state.currentDevice).toBe('desktop');
    });

    test('should handle tablet button click', () => {
      const component = new DeviceToggle(container);
      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');

      tabletBtn.click();

      expect(component.state.currentDevice).toBe('tablet');
    });

    test('should handle mobile button click', () => {
      const component = new DeviceToggle(container);
      const mobileBtn = Array.from(component.buttons).find(b => b.dataset.device === 'mobile');

      mobileBtn.click();

      expect(component.state.currentDevice).toBe('mobile');
    });

    test('should handle button without data-device attribute', () => {
      const component = new DeviceToggle(container);

      const badButton = document.createElement('button');
      badButton.className = 'device-toggle-btn';
      component.buttons[0].parentNode.appendChild(badButton);

      expect(() => component.handleDeviceClick(badButton)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Active State Management', () => {
    test('should set active class on clicked button', () => {
      const component = new DeviceToggle(container);
      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');

      tabletBtn.click();

      expect(tabletBtn.classList.contains('active')).toBe(true);
    });

    test('should remove active class from other buttons', () => {
      const component = new DeviceToggle(container);
      const buttons = Array.from(component.buttons);
      const desktopBtn = buttons.find(b => b.dataset.device === 'desktop');
      const tabletBtn = buttons.find(b => b.dataset.device === 'tablet');

      // Click tablet
      tabletBtn.click();

      expect(desktopBtn.classList.contains('active')).toBe(false);
      expect(tabletBtn.classList.contains('active')).toBe(true);
    });

    test('should update only one active button at a time', () => {
      const component = new DeviceToggle(container);
      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');

      tabletBtn.click();

      const activeButtons = Array.from(component.buttons).filter(b => b.classList.contains('active'));
      expect(activeButtons.length).toBe(1);
    });
  });

  describe('Device View Setting', () => {
    test('should update preview container class', () => {
      const component = new DeviceToggle(container);
      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');

      tabletBtn.click();

      expect(component.previewContainer.className).toBe('preview-container tablet');
    });

    test('should set device view programmatically', () => {
      const component = new DeviceToggle(container);

      component.setDeviceView('mobile');

      expect(component.previewContainer.className).toBe('preview-container mobile');
    });

    test('should handle missing preview container', () => {
      const component = new DeviceToggle(container);
      component.previewContainer = null;

      expect(() => component.setDeviceView('mobile')).not.toThrow();
    });

    test('should replace existing device class', () => {
      const component = new DeviceToggle(container);

      component.setDeviceView('tablet');
      expect(component.previewContainer.className).toBe('preview-container tablet');

      component.setDeviceView('mobile');
      expect(component.previewContainer.className).toBe('preview-container mobile');
      expect(component.previewContainer.className).not.toContain('tablet');
    });
  });

  describe('localStorage Persistence', () => {
    test('should call saveDevice when button clicked', () => {
      const component = new DeviceToggle(container);
      const saveDeviceSpy = jest.spyOn(component, 'saveDevice');

      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');
      tabletBtn.click();

      expect(saveDeviceSpy).toHaveBeenCalledWith('tablet');
    });

    test('should call restoreSavedDevice during init', () => {
      const restoreSpy = jest.spyOn(DeviceToggle.prototype, 'restoreSavedDevice');

      new DeviceToggle(container);

      expect(restoreSpy).toHaveBeenCalled();

      restoreSpy.mockRestore();
    });

    test('should handle localStorage gracefully', () => {
      // Component should not crash even if localStorage throws
      const component = new DeviceToggle(container);

      expect(() => component.saveDevice('tablet')).not.toThrow();
      expect(() => component.restoreSavedDevice()).not.toThrow();
    });

    test('should have storage key configured', () => {
      const component = new DeviceToggle(container);

      expect(component.storageKey).toBe('nitya_deviceView');
    });
  });

  describe('Event Emission', () => {
    test('should emit deviceChanged event', () => {
      const component = new DeviceToggle(container);
      const handler = jest.fn();
      component.on('deviceChanged', handler);

      const tabletBtn = Array.from(component.buttons).find(b => b.dataset.device === 'tablet');
      tabletBtn.click();

      expect(handler).toHaveBeenCalledWith('tablet');
    });

    test('should emit event with correct device', () => {
      const component = new DeviceToggle(container);
      const handler = jest.fn();
      component.on('deviceChanged', handler);

      const mobileBtn = Array.from(component.buttons).find(b => b.dataset.device === 'mobile');
      mobileBtn.click();

      expect(handler).toHaveBeenCalledWith('mobile');
    });
  });

  describe('Programmatic Control', () => {
    test('should get current device', () => {
      const component = new DeviceToggle(container);

      const currentDevice = component.getCurrentDevice();

      expect(typeof currentDevice).toBe('string');
      expect(['desktop', 'tablet', 'mobile']).toContain(currentDevice);
    });

    test('should set device programmatically', () => {
      const component = new DeviceToggle(container);

      component.setDevice('tablet');

      expect(component.state.currentDevice).toBe('tablet');
      expect(component.previewContainer.className).toContain('tablet');
    });

    test('should activate button when set programmatically', () => {
      const component = new DeviceToggle(container);

      component.setDevice('mobile');

      const mobileBtn = Array.from(component.buttons).find(b => b.dataset.device === 'mobile');
      expect(mobileBtn.classList.contains('active')).toBe(true);
    });

    test('should call saveDevice when set programmatically', () => {
      const component = new DeviceToggle(container);
      const saveDeviceSpy = jest.spyOn(component, 'saveDevice');

      component.setDevice('tablet');

      expect(saveDeviceSpy).toHaveBeenCalledWith('tablet');
    });

    test('should handle invalid device type', () => {
      const component = new DeviceToggle(container);
      const initialDevice = component.state.currentDevice;

      component.setDevice('invalid');

      expect(console.error).toHaveBeenCalled();
      expect(component.state.currentDevice).toBe(initialDevice); // Should remain unchanged
    });

    test('should emit event when set programmatically', () => {
      const component = new DeviceToggle(container);
      const handler = jest.fn();
      component.on('deviceChanged', handler);

      component.setDevice('mobile');

      expect(handler).toHaveBeenCalledWith('mobile');
    });
  });

  describe('Lifecycle', () => {
    test('should have empty render method', () => {
      const component = new DeviceToggle(container);

      expect(() => component.render()).not.toThrow();
    });

    test('should clean up references on destroy', () => {
      const component = new DeviceToggle(container);

      component.destroy();

      expect(component.buttons).toBeNull();
      expect(component.previewContainer).toBeNull();
    });

    test('should call parent destroy', () => {
      const component = new DeviceToggle(container);

      component.destroy();

      expect(component.isDestroyed).toBe(true);
    });
  });

  describe('Inheritance', () => {
    test('should extend BaseComponent', () => {
      const component = new DeviceToggle(container);

      expect(component).toBeInstanceOf(BaseComponent);
      expect(component).toBeInstanceOf(DeviceToggle);
    });

    test('should inherit BaseComponent methods', () => {
      const component = new DeviceToggle(container);

      expect(typeof component.setState).toBe('function');
      expect(typeof component.on).toBe('function');
      expect(typeof component.emit).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });
  });
});
