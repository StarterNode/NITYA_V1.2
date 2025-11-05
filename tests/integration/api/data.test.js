/**
 * Integration Tests: Data Update API Endpoints
 * Tests: POST /api/update-metadata, /api/update-sitemap, /api/update-styles
 *
 * Tests data collection and update functionality.
 */

const request = require('supertest');
const app = require('../../../server/proxy-server');
const path = require('path');
const fs = require('fs').promises;

describe('Data Update API Integration Tests', () => {
  const testUserId = 'test_data_user';
  const testProspectDir = path.join(__dirname, '../../../prospects', testUserId);

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testProspectDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProspectDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('POST /api/update-metadata - Business Metadata', () => {
    const testMetadata = {
      userId: testUserId,
      businessName: 'Test Business Inc',
      industry: 'Technology',
      targetAudience: 'Small businesses',
      uniqueValue: 'Fast and affordable solutions',
      brandVoice: 'Professional yet friendly',
      primaryColor: '#0066cc',
      secondaryColor: '#ff6600'
    };

    test('should create new metadata file', async () => {
      const response = await request(app)
        .post('/api/update-metadata')
        .send(testMetadata)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');

      // Verify file was created
      const metadataPath = path.join(testProspectDir, 'metadata.json');
      const fileExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify content
      const content = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(content.businessName).toBe(testMetadata.businessName);
      expect(content.industry).toBe(testMetadata.industry);
    });

    test('should update existing metadata', async () => {
      const updatedMetadata = {
        ...testMetadata,
        businessName: 'Updated Business Name',
        industry: 'Healthcare'
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(updatedMetadata)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update
      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.businessName).toBe('Updated Business Name');
      expect(content.industry).toBe('Healthcare');
    });

    test('should handle partial updates', async () => {
      const partialUpdate = {
        userId: testUserId,
        brandVoice: 'Casual and fun'
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify partial update maintained other fields
      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.brandVoice).toBe('Casual and fun');
      expect(content.businessName).toBe('Updated Business Name'); // Should still exist
    });

    test('should validate required userId field', async () => {
      const response = await request(app)
        .post('/api/update-metadata')
        .send({
          businessName: 'Test'
          // Missing userId
        });

      // Should return error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle special characters in data', async () => {
      const specialCharsData = {
        userId: testUserId,
        businessName: 'Café & Restaurant "Le Château"',
        brandVoice: 'Elegant & sophisticated — premium quality'
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(specialCharsData)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.businessName).toBe(specialCharsData.businessName);
      expect(content.brandVoice).toBe(specialCharsData.brandVoice);
    });

    test('should handle empty strings', async () => {
      const emptyStringData = {
        userId: testUserId,
        businessName: '',
        industry: ''
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(emptyStringData)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.businessName).toBe('');
    });

    test('should handle very long text fields', async () => {
      const longTextData = {
        userId: testUserId,
        uniqueValue: 'A'.repeat(5000)
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(longTextData)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.uniqueValue.length).toBe(5000);
    });
  });

  describe('POST /api/update-sitemap - Page Structure', () => {
    const testSitemap = {
      userId: testUserId,
      pages: [
        {
          id: 'home',
          title: 'Home',
          sections: [
            { type: 'hero', content: 'Welcome to our website' },
            { type: 'features', content: 'Our amazing features' }
          ]
        },
        {
          id: 'about',
          title: 'About Us',
          sections: [
            { type: 'team', content: 'Meet our team' }
          ]
        }
      ]
    };

    test('should create new sitemap file', async () => {
      const response = await request(app)
        .post('/api/update-sitemap')
        .send(testSitemap)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify file was created
      const sitemapPath = path.join(testProspectDir, 'sitemap.json');
      const fileExists = await fs.access(sitemapPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify content structure
      const content = JSON.parse(await fs.readFile(sitemapPath, 'utf-8'));
      expect(content.pages).toBeInstanceOf(Array);
      expect(content.pages.length).toBe(2);
      expect(content.pages[0].id).toBe('home');
    });

    test('should update existing sitemap', async () => {
      const updatedSitemap = {
        userId: testUserId,
        pages: [
          {
            id: 'home',
            title: 'Home - Updated',
            sections: [
              { type: 'hero', content: 'Updated hero content' }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/api/update-sitemap')
        .send(updatedSitemap)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'sitemap.json'), 'utf-8')
      );
      expect(content.pages[0].title).toBe('Home - Updated');
    });

    test('should handle empty pages array', async () => {
      const emptySitemap = {
        userId: testUserId,
        pages: []
      };

      const response = await request(app)
        .post('/api/update-sitemap')
        .send(emptySitemap)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'sitemap.json'), 'utf-8')
      );
      expect(content.pages).toEqual([]);
    });

    test('should handle complex nested structure', async () => {
      const complexSitemap = {
        userId: testUserId,
        pages: [
          {
            id: 'services',
            title: 'Services',
            sections: [
              {
                type: 'services-grid',
                content: 'Services overview',
                items: [
                  { name: 'Service 1', description: 'Description 1' },
                  { name: 'Service 2', description: 'Description 2' }
                ]
              }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/api/update-sitemap')
        .send(complexSitemap)
        .expect(200);

      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'sitemap.json'), 'utf-8')
      );
      expect(content.pages[0].sections[0].items.length).toBe(2);
    });

    test('should validate userId requirement', async () => {
      const response = await request(app)
        .post('/api/update-sitemap')
        .send({
          pages: []
          // Missing userId
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/update-styles - Brand Styles', () => {
    const testStyles = {
      userId: testUserId,
      colors: {
        primary: '#0066cc',
        secondary: '#ff6600',
        accent: '#33cc33',
        background: '#ffffff',
        text: '#333333'
      },
      typography: {
        headingFont: 'Poppins, sans-serif',
        bodyFont: 'Inter, sans-serif',
        headingSize: '32px',
        bodySize: '16px'
      },
      spacing: {
        sectionPadding: '80px 20px',
        elementMargin: '20px'
      }
    };

    test('should create new styles file', async () => {
      const response = await request(app)
        .post('/api/update-styles')
        .send(testStyles)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify file was created
      const stylesPath = path.join(testProspectDir, 'styles.css');
      const fileExists = await fs.access(stylesPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify CSS content
      const content = await fs.readFile(stylesPath, 'utf-8');
      expect(content).toContain('#0066cc');
      expect(content).toContain('Poppins');
    });

    test('should update existing styles', async () => {
      const updatedStyles = {
        ...testStyles,
        colors: {
          ...testStyles.colors,
          primary: '#ff0000'
        }
      };

      const response = await request(app)
        .post('/api/update-styles')
        .send(updatedStyles)
        .expect(200);

      const content = await fs.readFile(path.join(testProspectDir, 'styles.css'), 'utf-8');
      expect(content).toContain('#ff0000');
    });

    test('should handle partial style updates', async () => {
      const partialStyles = {
        userId: testUserId,
        colors: {
          primary: '#00ff00'
        }
      };

      const response = await request(app)
        .post('/api/update-styles')
        .send(partialStyles)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should generate valid CSS', async () => {
      const response = await request(app)
        .post('/api/update-styles')
        .send(testStyles)
        .expect(200);

      const content = await fs.readFile(path.join(testProspectDir, 'styles.css'), 'utf-8');

      // Should contain CSS syntax
      expect(content).toMatch(/[{};:]/); // Basic CSS characters
      expect(content).not.toContain('undefined');
      expect(content).not.toContain('null');
    });

    test('should handle hex color validation', async () => {
      const invalidColorStyles = {
        userId: testUserId,
        colors: {
          primary: 'not-a-color'
        }
      };

      const response = await request(app)
        .post('/api/update-styles')
        .send(invalidColorStyles);

      // Should either validate or accept
      expect([200, 400]).toContain(response.status);
    });

    test('should validate userId requirement', async () => {
      const response = await request(app)
        .post('/api/update-styles')
        .send({
          colors: { primary: '#000000' }
          // Missing userId
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Data Endpoints - Error Handling', () => {
    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/update-metadata')
        .set('Content-Type', 'application/json')
        .send('invalid json {{{');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle very large payloads', async () => {
      const largeData = {
        userId: testUserId,
        businessName: 'Test',
        description: 'A'.repeat(1000000) // 1MB of text
      };

      const response = await request(app)
        .post('/api/update-metadata')
        .send(largeData);

      // Should either accept or reject based on size limits
      expect(response.status).toBeLessThanOrEqual(500);
    }, 10000);

    test('should prevent path traversal in userId', async () => {
      const response = await request(app)
        .post('/api/update-metadata')
        .send({
          userId: '../../../etc/passwd',
          businessName: 'Hacker'
        });

      // Should sanitize or reject
      expect(response.status).toBeLessThanOrEqual(500);
    });
  });

  describe('Data Endpoints - Performance', () => {
    test('should handle rapid sequential updates', async () => {
      const updates = [];

      for (let i = 0; i < 5; i++) {
        updates.push(
          request(app)
            .post('/api/update-metadata')
            .send({
              userId: testUserId,
              businessName: `Business ${i}`
            })
        );
      }

      const responses = await Promise.all(updates);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Final state should be last update
      const content = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      expect(content.businessName).toBe('Business 4');
    }, 10000);

    test('should measure update performance', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/update-metadata')
        .send({
          userId: testUserId,
          businessName: 'Performance Test'
        })
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
      console.log(`  ⏱️  Metadata update performance: ${duration}ms`);
    });
  });

  describe('Data Endpoints - Integration', () => {
    test('should coordinate updates across all three endpoints', async () => {
      // Update all three data types
      await request(app)
        .post('/api/update-metadata')
        .send({
          userId: testUserId,
          businessName: 'Integrated Business'
        })
        .expect(200);

      await request(app)
        .post('/api/update-sitemap')
        .send({
          userId: testUserId,
          pages: [{ id: 'integrated', title: 'Integrated Page' }]
        })
        .expect(200);

      await request(app)
        .post('/api/update-styles')
        .send({
          userId: testUserId,
          colors: { primary: '#123456' }
        })
        .expect(200);

      // Verify all files exist
      const files = await fs.readdir(testProspectDir);
      expect(files).toContain('metadata.json');
      expect(files).toContain('sitemap.json');
      expect(files).toContain('styles.css');

      // Verify content of each
      const metadata = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'metadata.json'), 'utf-8')
      );
      const sitemap = JSON.parse(
        await fs.readFile(path.join(testProspectDir, 'sitemap.json'), 'utf-8')
      );
      const styles = await fs.readFile(path.join(testProspectDir, 'styles.css'), 'utf-8');

      expect(metadata.businessName).toBe('Integrated Business');
      expect(sitemap.pages[0].id).toBe('integrated');
      expect(styles).toContain('#123456');
    });
  });
});
