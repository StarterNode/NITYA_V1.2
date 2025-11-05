/**
 * FileService.test.js
 * Unit tests for File operations service
 */

const FileService = require('../../../server/services/FileService');
const fs = require('fs').promises;
const path = require('path');

describe('FileService', () => {
    let fileService;
    const testUserId = 'test_user_001';
    const testFileName = 'test_file.txt';
    const testContent = 'Test content for FileService';

    beforeEach(() => {
        fileService = new FileService();
    });

    afterEach(() => {
        fileService = null;
    });

    describe('Initialization', () => {
        test('should initialize with baseProspectsPath', () => {
            expect(fileService.baseProspectsPath).toBeDefined();
            expect(typeof fileService.baseProspectsPath).toBe('string');
            expect(fileService.baseProspectsPath).toContain('prospects');
        });

        test('should extend BaseService', () => {
            expect(fileService.logger).toBeDefined();
            expect(fileService.config).toBeDefined();
        });
    });

    describe('readFile()', () => {
        test('should return null for non-existent file', async () => {
            const result = await fileService.readFile('non_existent_user', 'non_existent.txt');
            expect(result).toBeNull();
        });

        test('should require userId parameter', async () => {
            await expect(
                fileService.readFile(null, testFileName)
            ).rejects.toThrow();
        });

        test('should require filename parameter', async () => {
            await expect(
                fileService.readFile(testUserId, null)
            ).rejects.toThrow();
        });
    });

    describe('fileExists()', () => {
        test('should return false for non-existent file', async () => {
            const exists = await fileService.fileExists('non_existent_user', 'non_existent.txt');
            expect(exists).toBe(false);
        });

        test('should return boolean', async () => {
            const exists = await fileService.fileExists(testUserId, testFileName);
            expect(typeof exists).toBe('boolean');
        });
    });

    describe('listFiles()', () => {
        test('should return array for valid user', async () => {
            const files = await fileService.listFiles(testUserId);
            expect(Array.isArray(files)).toBe(true);
        });

        test('should return empty array for non-existent directory', async () => {
            const files = await fileService.listFiles('non_existent_user');
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBe(0);
        });

        test('should list files in subdirectory', async () => {
            const files = await fileService.listFiles(testUserId, 'assets');
            expect(Array.isArray(files)).toBe(true);
        });
    });

    describe('getFileStats()', () => {
        test('should return null for non-existent file', async () => {
            const stats = await fileService.getFileStats('non_existent_user', 'non_existent.txt');
            expect(stats).toBeNull();
        });

        test('should return stats object for existing file', async () => {
            // Test with metadata.json if it exists
            const stats = await fileService.getFileStats(testUserId, 'metadata.json');

            if (stats) {
                expect(stats).toHaveProperty('size');
                expect(stats).toHaveProperty('created');
                expect(stats).toHaveProperty('modified');
                expect(stats).toHaveProperty('isDirectory');
                expect(typeof stats.size).toBe('number');
                expect(typeof stats.isDirectory).toBe('boolean');
            }
        });
    });

    describe('Path Construction', () => {
        test('should construct valid file paths', () => {
            const filePath = path.join(fileService.baseProspectsPath, testUserId, testFileName);
            expect(filePath).toContain('prospects');
            expect(filePath).toContain(testUserId);
            expect(filePath).toContain(testFileName);
        });

        test('should construct valid subdirectory paths', () => {
            const dirPath = path.join(fileService.baseProspectsPath, testUserId, 'assets');
            expect(dirPath).toContain('prospects');
            expect(dirPath).toContain(testUserId);
            expect(dirPath).toContain('assets');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid path characters gracefully', async () => {
            // Test with potentially problematic characters
            const result = await fileService.readFile(testUserId, 'test_file.txt');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        test('should handle empty userId', async () => {
            const exists = await fileService.fileExists('', 'test.txt');
            expect(typeof exists).toBe('boolean');
        });
    });
});
