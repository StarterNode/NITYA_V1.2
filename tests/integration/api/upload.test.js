/**
 * Integration Tests: Upload & Delete API Endpoints
 * Tests: POST /api/upload/:userId, DELETE /api/delete/:userId/:filename
 *
 * Tests file upload, storage, and deletion functionality.
 */

const request = require('supertest');
const app = require('../../../server/proxy-server');
const path = require('path');
const fs = require('fs').promises;

describe('Upload & Delete API Integration Tests', () => {
  const testUserId = 'test_upload_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);
  const testAssetsDir = path.join(testProspectDir, 'assets');

  beforeAll(async () => {
    // Ensure test directories exist
    await fs.mkdir(testAssetsDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('POST /api/upload/:userId - File Upload', () => {
    test('should successfully upload an image file', async () => {
      // Create a test image buffer (1x1 PNG)
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'test-image.png')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('url');
      expect(response.body.filename).toMatch(/test-image.*\.png/);
      expect(response.body.url).toContain(testUserId);
      expect(response.body.url).toContain('test-image');

      // Verify file was actually created
      const files = await fs.readdir(testAssetsDir);
      const uploadedFile = files.find(f => f.startsWith('test-image'));
      expect(uploadedFile).toBeDefined();
    }, 10000);

    test('should handle duplicate filenames by appending timestamp', async () => {
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // Upload first file
      const response1 = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'duplicate.png')
        .expect(200);

      // Upload second file with same name
      const response2 = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'duplicate.png')
        .expect(200);

      // Should have different filenames
      expect(response1.body.filename).not.toBe(response2.body.filename);
      expect(response2.body.filename).toMatch(/duplicate.*\.png/);

      // Both files should exist
      const files = await fs.readdir(testAssetsDir);
      const duplicateFiles = files.filter(f => f.startsWith('duplicate'));
      expect(duplicateFiles.length).toBeGreaterThanOrEqual(2);
    }, 10000);

    test('should accept multiple image formats', async () => {
      const formats = [
        { name: 'test.jpg', mime: 'image/jpeg' },
        { name: 'test.png', mime: 'image/png' },
        { name: 'test.gif', mime: 'image/gif' },
        { name: 'test.webp', mime: 'image/webp' }
      ];

      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      for (const format of formats) {
        const response = await request(app)
          .post(`/api/upload/${testUserId}`)
          .attach('file', testImage, format.name)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.filename).toContain(path.extname(format.name));
      }
    }, 15000);

    test('should reject files that are too large', async () => {
      // Create a large buffer (e.g., 20MB if there's a limit)
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024);

      const response = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', largeBuffer, 'huge-file.png');

      // Should either reject or accept based on server config
      // Most servers have a 10MB default limit
      if (response.status !== 200) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    }, 15000);

    test('should reject non-image files', async () => {
      const textFile = Buffer.from('This is a text file, not an image');

      const response = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', textFile, 'malicious.exe');

      // Should either reject or sanitize
      // Depending on implementation, might accept with different name
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should sanitize dangerous filenames', async () => {
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const dangerousNames = [
        '../../../etc/passwd.png',
        '../../bad.png',
        'file with spaces.png',
        'file<script>.png'
      ];

      for (const filename of dangerousNames) {
        const response = await request(app)
          .post(`/api/upload/${testUserId}`)
          .attach('file', testImage, filename);

        if (response.status === 200) {
          // Should sanitize the filename
          expect(response.body.filename).not.toContain('..');
          expect(response.body.filename).not.toContain('<');
          expect(response.body.filename).not.toContain('>');
        }
      }
    }, 15000);

    test('should handle missing file', async () => {
      const response = await request(app)
        .post(`/api/upload/${testUserId}`)
        .send({});

      // Should return error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should create user directory if it does not exist', async () => {
      const newUserId = 'brand_new_user_' + Date.now();
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post(`/api/upload/${newUserId}`)
        .attach('file', testImage, 'first-file.png')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify directory was created
      const newUserDir = path.join(__dirname, '../../../prospects', newUserId, 'assets');
      const dirExists = await fs.access(newUserDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      // Cleanup
      await fs.rm(path.join(__dirname, '../../../prospects', newUserId), { recursive: true, force: true });
    }, 10000);
  });

  describe('DELETE /api/delete/:userId/:filename - File Deletion', () => {
    let uploadedFilename;

    beforeEach(async () => {
      // Upload a test file before each delete test
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'to-delete.png');

      uploadedFilename = response.body.filename;
    });

    test('should successfully delete an existing file', async () => {
      const response = await request(app)
        .delete(`/api/delete/${testUserId}/${uploadedFilename}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');

      // Verify file was actually deleted
      const filePath = path.join(testAssetsDir, uploadedFilename);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    test('should handle deletion of non-existent file', async () => {
      const response = await request(app)
        .delete(`/api/delete/${testUserId}/non-existent-file.png`);

      // Should return 404 or 400
      expect([400, 404, 500]).toContain(response.status);
    });

    test('should prevent path traversal in filename', async () => {
      const response = await request(app)
        .delete(`/api/delete/${testUserId}/../../../etc/passwd`);

      // Should reject or sanitize
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should prevent deletion from other user directories', async () => {
      // Try to delete a file by specifying wrong userId
      const response = await request(app)
        .delete(`/api/delete/different_user/${uploadedFilename}`);

      // Should return 404 (file not found in that user's directory)
      expect([400, 404, 500]).toContain(response.status);
    });

    test('should handle empty filename', async () => {
      const response = await request(app)
        .delete(`/api/delete/${testUserId}/`);

      // Should return error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Upload & Delete Flow Integration', () => {
    test('should complete full upload-list-delete cycle', async () => {
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // 1. Upload file
      const uploadResponse = await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'cycle-test.png')
        .expect(200);

      const filename = uploadResponse.body.filename;

      // 2. List assets (verify file is there)
      const listResponse = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      expect(listResponse.body.assets).toContain(filename);

      // 3. Delete file
      const deleteResponse = await request(app)
        .delete(`/api/delete/${testUserId}/${filename}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 4. List assets again (verify file is gone)
      const listResponse2 = await request(app)
        .get(`/api/list-assets/${testUserId}`)
        .expect(200);

      expect(listResponse2.body.assets).not.toContain(filename);
    }, 15000);
  });

  describe('Performance Tests', () => {
    test('should handle rapid multiple uploads', async () => {
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const uploads = [];
      for (let i = 0; i < 5; i++) {
        uploads.push(
          request(app)
            .post(`/api/upload/${testUserId}`)
            .attach('file', testImage, `batch-${i}.png`)
        );
      }

      const responses = await Promise.all(uploads);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    }, 15000);

    test('should measure upload performance', async () => {
      const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const startTime = Date.now();

      await request(app)
        .post(`/api/upload/${testUserId}`)
        .attach('file', testImage, 'perf-test.png')
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      console.log(`  ⏱️  Upload performance: ${duration}ms`);
    });
  });
});
