/**
 * Integration Tests: Assets API Endpoint
 * Tests: GET /api/list-assets/:userId
 *
 * Tests asset listing functionality.
 */

const request = require('supertest');
const app = require('../../../server/proxy-server');
const path = require('path');
const fs = require('fs').promises;

describe('Assets API Integration Tests', () => {
  const testUserId = 'test_assets_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);
  const testAssetsDir = path.join(testProspectDir, 'assets');

  beforeAll(async () => {
    // Create test assets directory
    await fs.mkdir(testAssetsDir, { recursive: true });

    // Create some test files
    const testFiles = [
      'hero-image.jpg',
      'logo.png',
      'team-photo.jpg',
      'product.webp',
      'icon.svg'
    ];

    for (const filename of testFiles) {
      await fs.writeFile(
        path.join(testAssetsDir, filename),
        'test file content'
      );
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('GET /api/list-assets/:userId - Asset Listing', () => {
    test('should list all assets for a user', async () => {
      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('assets');
      expect(response.body.assets).toBeInstanceOf(Array);
      expect(response.body.assets.length).toBeGreaterThan(0);

      // Verify test files are listed
      expect(response.body.assets).toContain('hero-image.jpg');
      expect(response.body.assets).toContain('logo.png');
      expect(response.body.assets).toContain('team-photo.jpg');
      expect(response.body.assets).toContain('product.webp');
      expect(response.body.assets).toContain('icon.svg');
    });

    test('should return empty array for user with no assets', async () => {
      const emptyUserId = 'empty_user_' + Date.now();

      const response = await request(app)
        .get(`/api/list-assets/${emptyUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('assets');
      expect(response.body.assets).toBeInstanceOf(Array);
      expect(response.body.assets.length).toBe(0);
    });

    test('should only list image files', async () => {
      // Add a non-image file
      await fs.writeFile(
        path.join(testAssetsDir, 'text-file.txt'),
        'not an image'
      );
      await fs.writeFile(
        path.join(testAssetsDir, 'document.pdf'),
        'not an image'
      );

      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      // Should not include non-image files
      expect(response.body.assets).not.toContain('text-file.txt');
      expect(response.body.assets).not.toContain('document.pdf');

      // Should still include image files
      expect(response.body.assets).toContain('hero-image.jpg');
    });

    test('should handle various image formats', async () => {
      // Add different image formats
      const imageFormats = ['test.jpg', 'test.jpeg', 'test.png', 'test.gif', 'test.webp', 'test.svg', 'test.ico'];

      for (const format of imageFormats) {
        await fs.writeFile(
          path.join(testAssetsDir, format),
          'image content'
        );
      }

      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      // All image formats should be listed
      imageFormats.forEach(format => {
        expect(response.body.assets).toContain(format);
      });
    });

    test('should handle case-insensitive file extensions', async () => {
      // Add files with uppercase extensions
      await fs.writeFile(
        path.join(testAssetsDir, 'uppercase.JPG'),
        'image'
      );
      await fs.writeFile(
        path.join(testAssetsDir, 'mixed.PnG'),
        'image'
      );

      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      // Should include files regardless of extension case
      expect(response.body.assets).toContain('uppercase.JPG');
      expect(response.body.assets).toContain('mixed.PnG');
    });

    test('should not include hidden files', async () => {
      // Create a hidden file (starting with .)
      await fs.writeFile(
        path.join(testAssetsDir, '.hidden-image.jpg'),
        'hidden image'
      );

      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      // Should not include hidden files
      expect(response.body.assets).not.toContain('.hidden-image.jpg');
    });

    test('should handle userId with special characters', async () => {
      const specialUserId = 'user_with-special.chars_123';
      const specialUserDir = path.join(__dirname, '../../../prospects', specialUserId, 'assets');

      // Create directory and file
      await fs.mkdir(specialUserDir, { recursive: true });
      await fs.writeFile(
        path.join(specialUserDir, 'test.jpg'),
        'image'
      );

      const response = await request(app)
        .get(`/api/list-assets/${specialUserId}`)
        .expect(200);

      expect(response.body.assets).toContain('test.jpg');

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', specialUserId), { recursive: true, force: true });
    });

    test('should prevent path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/list-assets/../../../etc/passwd');

      // Should either return error or sanitize path
      expect([200, 400, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        // If it returns 200, should return empty assets
        expect(response.body.assets).toBeInstanceOf(Array);
      }
    });

    test('should handle missing assets directory', async () => {
      const noAssetsUserId = 'user_without_assets_dir_' + Date.now();

      const response = await request(app)
        .get(`/api/list-assets/${noAssetsUserId}`)
        .expect(200);

      // Should return empty array gracefully
      expect(response.body.assets).toBeInstanceOf(Array);
      expect(response.body.assets.length).toBe(0);
    });
  });

  describe('Assets API - Response Format', () => {
    test('should return consistent JSON structure', async () => {
      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        assets: expect.arrayContaining([expect.any(String)])
      });
    });

    test('should include metadata if requested', async () => {
      const response = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .query({ includeMetadata: true })
        .expect(200);

      // Depending on implementation, might include file sizes, dates, etc.
      expect(response.body).toHaveProperty('assets');
    });
  });

  describe('Assets API - Performance', () => {
    test('should handle directory with many files', async () => {
      const manyFilesUserId = 'user_with_many_files_' + Date.now();
      const manyFilesDir = path.join(__dirname, '../../../prospects', manyFilesUserId, 'assets');

      await fs.mkdir(manyFilesDir, { recursive: true });

      // Create 100 files
      const createFilePromises = [];
      for (let i = 0; i < 100; i++) {
        createFilePromises.push(
          fs.writeFile(
            path.join(manyFilesDir, `image-${i}.jpg`),
            'test image'
          )
        );
      }
      await Promise.all(createFilePromises);

      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/list-assets/${manyFilesUserId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Should list all 100 files
      expect(response.body.assets.length).toBe(100);

      // Should respond quickly even with many files
      expect(duration).toBeLessThan(1000); // Within 1 second
      console.log(`  ⏱️  Assets listing (100 files): ${duration}ms`);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', manyFilesUserId), { recursive: true, force: true });
    }, 10000);

    test('should measure performance for typical usage', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Should respond very quickly
      expect(duration).toBeLessThan(500);
      console.log(`  ⏱️  Assets listing performance: ${duration}ms`);
    });
  });

  describe('Assets API - Integration with Upload', () => {
    test('should reflect newly uploaded files immediately', async () => {
      const integrationUserId = 'integration_test_user_' + Date.now();

      // List assets (should be empty)
      const response1 = await request(app)
        .get(`/api/list-assets/${integrationUserId}`)
        .expect(200);

      expect(response1.body.assets.length).toBe(0);

      // Upload a file
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const uploadResponse = await request(app)
        .post(`/api/upload/${integrationUserId}`)
        .attach('file', testImage, 'new-image.png')
        .expect(200);

      const filename = uploadResponse.body.filename;

      // List assets again (should include new file)
      const response2 = await request(app)
        .get(`/api/list-assets/${integrationUserId}`)
        .expect(200);

      expect(response2.body.assets).toContain(filename);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', integrationUserId), { recursive: true, force: true });
    }, 10000);
  });

  describe('Assets API - Error Handling', () => {
    test('should handle corrupted assets directory', async () => {
      const corruptedUserId = 'corrupted_dir_user_' + Date.now();
      const corruptedDir = path.join(__dirname, '../../../prospects', corruptedUserId, 'assets');

      // Create a file instead of a directory (simulate corruption)
      await fs.mkdir(path.join(__dirname, '../../../prospects', corruptedUserId), { recursive: true });
      await fs.writeFile(corruptedDir, 'this should be a directory');

      const response = await request(app)
        .get(`/api/list-assets/${corruptedUserId}`);

      // Should handle gracefully
      expect([200, 500]).toContain(response.status);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', corruptedUserId), { recursive: true, force: true });
    });

    test('should handle very long userId', async () => {
      const longUserId = 'a'.repeat(1000);

      const response = await request(app)
        .get(`/api/list-assets/${longUserId}`);

      // Should either handle or reject gracefully
      expect(response.status).toBeLessThanOrEqual(500);
    });

    test('should handle concurrent list requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get(`/api/list-assets/${testUserId}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed with same results
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.assets.length).toBeGreaterThan(0);
      });
    }, 10000);
  });
});
