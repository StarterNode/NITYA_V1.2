const MCPService = require('./MCPService');
const ChatService = require('./ChatService');
const PromptService = require('./PromptService');
const FileService = require('./FileService');
const FolderService = require('./FolderService');
const DataService = require('./DataService');
const SessionService = require('./SessionService');

/**
 * ServiceContainer - Centralized dependency injection container
 * Manages all service instances and their dependencies
 */
class ServiceContainer {
  constructor(config = {}) {
    this.config = config;
    this.services = {};
    this.initialized = false;
  }

  /**
   * Initialize all services with proper dependency injection
   * Services are initialized in dependency order
   */
  initialize() {
    if (this.initialized) {
      console.log('⚠️ ServiceContainer: Already initialized');
      return;
    }

    console.log('🏗️ ServiceContainer: Initializing services...');

    // Level 1: Services with no dependencies
    this.services.fileService = new FileService();
    this.services.folderService = new FolderService();
    this.services.mcpService = new MCPService();

    // Level 2: Services that depend on Level 1
    this.services.dataService = new DataService({
      fileService: this.services.fileService
    });

    this.services.promptService = new PromptService();

    // Level 3: Services that depend on Level 2
    this.services.sessionService = new SessionService({
      dataService: this.services.dataService
    });

    this.services.chatService = new ChatService({
      mcpService: this.services.mcpService,
      promptService: this.services.promptService,
      config: this.config
    });

    this.initialized = true;

    console.log('✅ ServiceContainer: All services initialized');
    console.log(`📦 ServiceContainer: ${Object.keys(this.services).length} services ready`);
  }

  /**
   * Get a service by name
   * @param {string} serviceName - Service name
   * @returns {Object} - Service instance
   */
  get(serviceName) {
    if (!this.initialized) {
      this.initialize();
    }

    const service = this.services[serviceName];

    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    return service;
  }

  /**
   * Get the MCP service
   * @returns {MCPService}
   */
  get mcpService() {
    return this.get('mcpService');
  }

  /**
   * Get the chat service
   * @returns {ChatService}
   */
  get chatService() {
    return this.get('chatService');
  }

  /**
   * Get the prompt service
   * @returns {PromptService}
   */
  get promptService() {
    return this.get('promptService');
  }

  /**
   * Get the file service
   * @returns {FileService}
   */
  get fileService() {
    return this.get('fileService');
  }

  /**
   * Get the folder service
   * @returns {FolderService}
   */
  get folderService() {
    return this.get('folderService');
  }

  /**
   * Get the data service
   * @returns {DataService}
   */
  get dataService() {
    return this.get('dataService');
  }

  /**
   * Get the session service
   * @returns {SessionService}
   */
  get sessionService() {
    return this.get('sessionService');
  }

  /**
   * Get all service names
   * @returns {Array<string>}
   */
  getServiceNames() {
    return Object.keys(this.services);
  }

  /**
   * Check if container is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = ServiceContainer;
