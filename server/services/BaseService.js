/**
 * BaseService - Abstract base class for all services
 * Provides common functionality: logging, error handling, dependency injection
 */
class BaseService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || console;
    this.config = dependencies.config || {};
  }

  /**
   * Execute a service operation with logging and error handling
   * @param {string} operation - The operation name (method name)
   * @param {Object} params - Parameters for the operation
   * @returns {Promise<any>} - The operation result
   */
  async execute(operation, params) {
    try {
      this.logger.info(`${this.constructor.name}: ${operation} starting`, params);
      const result = await this[operation](params);
      this.logger.info(`${this.constructor.name}: ${operation} completed`);
      return result;
    } catch (error) {
      this.logger.error(`${this.constructor.name}: ${operation} failed`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Transform errors to standard format
   * @param {Error} error - The error to handle
   * @returns {Object} - Standardized error object
   */
  handleError(error) {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      service: this.constructor.name,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BaseService;
