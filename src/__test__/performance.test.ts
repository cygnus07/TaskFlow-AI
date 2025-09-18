import request from 'supertest';
import { createApp } from '../app.js';
import { 
  createTestTenant, 
  createTestUser, 
  createTestProject,
  createTestTask,
  createAuthenticatedRequest 
} from '../../tests/helpers/index.js';

describe('Performance and Caching', () => {
  let app: any;
  let authRequest: any;
  let tenant: any;
  let user: any;
  let project: any;

  beforeAll(async () => {
    app = createApp();
    tenant = await createTestTenant();
    user = await createTestUser(tenant._id);
    authRequest = createAuthenticatedRequest(app, user, tenant);
    project = await createTestProject(tenant._id, user._id);
  });

  describe('Response Time', () => {
    it('should respond to health check quickly', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should respond in less than 100ms
    });

    it('should handle concurrent requests', async () => {
      const promises = [];
      
      // Make 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          authRequest.get('/api/projects').expect(200)
        );
      }

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // All requests should complete in 2s
    });
  });

  describe('Caching', () => {
    it('should cache GET requests', async () => {
      // First request - cache miss
      const res1 = await authRequest
        .get(`/api/projects/${project._id}`)
        .expect(200);
      
      expect(res1.headers['x-cache']).toBe('MISS');
      const responseTime1 = parseInt(res1.headers['x-response-time'] || '0');

      // Second request - cache hit
      const res2 = await authRequest
        .get(`/api/projects/${project._id}`)
        .expect(200);
      
      expect(res2.headers['x-cache']).toBe('HIT');
      const responseTime2 = parseInt(res2.headers['x-response-time'] || '0');

      // Cached response should be faster
      expect(responseTime2).toBeLessThan(responseTime1);
    });

    it('should invalidate cache on updates', async () => {
      // Prime cache
      await authRequest
        .get(`/api/projects/${project._id}`)
        .expect(200);

      // Update project
      await authRequest
        .put(`/api/projects/${project._id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Next GET should be cache miss
      const res = await authRequest
        .get(`/api/projects/${project._id}`)
        .expect(200);
      
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body.data.project.name).toBe('Updated Name');
    });
  });

  describe('Database Query Optimization', () => {
    beforeEach(async () => {
      // Create many tasks for testing
      const taskPromises = [];
      for (let i = 0; i < 50; i++) {
        taskPromises.push(
          createTestTask(project._id, tenant._id, {
            title: `Task ${i}`,
            priority: i % 2 === 0 ? 'high' : 'low',
            status: i % 3 === 0 ? 'done' : 'todo',
          })
        );
      }
      await Promise.all(taskPromises);
    });

    it('should efficiently query tasks with filters', async () => {
      const start = Date.now();
      
      const res = await authRequest
        .get(`/api/projects/${project._id}/tasks?status=done&priority=high`)
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // Query should be fast even with many tasks
      expect(res.body.data.tasks.length).toBeGreaterThan(0);
    });

    it('should use indexes for common queries', async () => {
      // Test multiple filter combinations
      const queries = [
        'status=todo',
        'priority=high',
        'status=in-progress&priority=urgent',
        'search=Task',
      ];

      const durations = await Promise.all(
        queries.map(async (query) => {
          const start = Date.now();
          await authRequest
            .get(`/api/projects/${project._id}/tasks?${query}`)
            .expect(200);
          return Date.now() - start;
        })
      );

      // All queries should be fast
      durations.forEach(duration => {
        expect(duration).toBeLessThan(150);
      });
    });
  });
});