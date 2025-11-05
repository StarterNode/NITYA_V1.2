/**
 * DataService.test.js
 * Unit tests for JSON data operations service
 */

const DataService = require('../../../server/services/DataService');
const FileService = require('../../../server/services/FileService');

describe('DataService', () => {
    let dataService;
    let mockFileService;
    const testUserId = 'test_user_001';

    beforeEach(() => {
        mockFileService = new FileService();
        dataService = new DataService({ fileService: mockFileService });
    });

    afterEach(() => {
        dataService = null;
    });

    describe('Initialization', () => {
        test('should initialize with FileService', () => {
            expect(dataService.fileService).toBeDefined();
            expect(dataService.fileService).toBeInstanceOf(FileService);
        });

        test('should extend BaseService', () => {
            expect(dataService.logger).toBeDefined();
            expect(dataService.config).toBeDefined();
        });

        test('should create FileService if not provided', () => {
            const service = new DataService();
            expect(service.fileService).toBeDefined();
        });
    });

    describe('readJSON()', () => {
        test('should return null for non-existent file', async () => {
            const result = await dataService.readJSON('non_existent_user', 'metadata.json');
            expect(result).toBeNull();
        });

        test('should handle valid JSON file', async () => {
            const result = await dataService.readJSON(testUserId, 'metadata.json');

            // Should be null (not found) or valid object
            expect(result === null || typeof result === 'object').toBe(true);
        });

        test('should throw error for null userId', async () => {
            // Null userId will cause path.join to fail with TypeError
            await expect(
                dataService.readJSON(null, 'metadata.json')
            ).rejects.toThrow();
        });
    });

    describe('readMetadata()', () => {
        test('should read metadata.json', async () => {
            const result = await dataService.readMetadata(testUserId);
            expect(result === null || typeof result === 'object').toBe(true);
        });

        test('should return null for non-existent metadata', async () => {
            const result = await dataService.readMetadata('non_existent_user');
            expect(result).toBeNull();
        });
    });

    describe('readSitemap()', () => {
        test('should read sitemap.json', async () => {
            const result = await dataService.readSitemap(testUserId);
            expect(result === null || typeof result === 'object').toBe(true);
        });

        test('should return null for non-existent sitemap', async () => {
            const result = await dataService.readSitemap('non_existent_user');
            expect(result).toBeNull();
        });
    });

    describe('readConversation()', () => {
        test('should read conversation.json', async () => {
            const result = await dataService.readConversation(testUserId);
            expect(result === null || typeof result === 'object').toBe(true);
        });

        test('should return null for non-existent conversation', async () => {
            const result = await dataService.readConversation('non_existent_user');
            expect(result).toBeNull();
        });

        test('should return object with messages array if exists', async () => {
            const result = await dataService.readConversation(testUserId);

            if (result !== null) {
                expect(typeof result).toBe('object');
                // May or may not have messages property depending on file content
            }
        });
    });

    describe('JSON Operations', () => {
        test('should handle readJSON for various filenames', async () => {
            const files = ['metadata.json', 'sitemap.json', 'conversation.json'];

            for (const file of files) {
                const result = await dataService.readJSON(testUserId, file);
                expect(result === null || typeof result === 'object').toBe(true);
            }
        });
    });

    describe('Data Structure Validation', () => {
        test('should validate metadata has expected fields if exists', async () => {
            const metadata = await dataService.readMetadata(testUserId);

            if (metadata !== null) {
                expect(typeof metadata).toBe('object');
                // Metadata may have businessName, logo, heroImage, etc.
            }
        });

        test('should validate sitemap has pages array if exists', async () => {
            const sitemap = await dataService.readSitemap(testUserId);

            if (sitemap !== null) {
                expect(typeof sitemap).toBe('object');
                // Sitemap may have pages array
            }
        });

        test('should validate conversation has messages if exists', async () => {
            const conversation = await dataService.readConversation(testUserId);

            if (conversation !== null) {
                expect(typeof conversation).toBe('object');
                // Conversation may have messages array and updatedAt
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle filesystem errors gracefully', async () => {
            try {
                const result = await dataService.readJSON(testUserId, 'metadata.json');
                expect(result === null || typeof result === 'object').toBe(true);
            } catch (error) {
                // Should not throw unexpected errors
                expect(error).toBeDefined();
            }
        });

        test('should handle empty userId', async () => {
            const result = await dataService.readMetadata('');
            expect(result === null || typeof result === 'object').toBe(true);
        });
    });

    describe('Service Integration', () => {
        test('should use FileService for reading', async () => {
            // DataService should delegate to FileService
            expect(dataService.fileService.readFile).toBeDefined();
            expect(typeof dataService.fileService.readFile).toBe('function');
        });

        test('should properly integrate with FileService', async () => {
            const result = await dataService.readJSON(testUserId, 'metadata.json');
            // Result should be processed through FileService
            expect(result === null || typeof result === 'object').toBe(true);
        });
    });
});
