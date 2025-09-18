import { createApp } from '../app.js';
import { 
  createTestTenant, 
  createTestUser, 
  createTestProject,
  createTestTask,
  createAuthenticatedRequest 
} from '../../tests/helpers/index.js';

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                prioritizations: [{
                  taskId: 'test-task-id',
                  suggestedPriority: 'high',
                  priorityScore: 85,
                  reasoning: 'Critical path task',
                  estimatedComplexity: 7,
                }],
              }),
            },
          }],
        }),
      },
    },
  })),
}));

describe('AI Service', () => {
  let app: any;
  let authRequest: any;
  let tenant: any;
  let user: any;
  let project: any;

  beforeAll(async () => {
    app = createApp();
    
    // Enable AI features for testing
    process.env.AI_FEATURES_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    
    tenant = await createTestTenant({ plan: 'pro' });
    user = await createTestUser(tenant._id, { role: 'manager' });
    authRequest = createAuthenticatedRequest(app, user, tenant);
    project = await createTestProject(tenant._id, user._id);
  });

  describe('POST /api/projects/:projectId/ai/prioritize', () => {
    it('should prioritize tasks with AI', async () => {
      // Create test tasks
    //   const task1 = await createTestTask(project._id, tenant._id, {
    //     title: 'Important task',
    //     priority: 'low',
    //   });

      const res = await authRequest
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.prioritizations).toHaveLength(1);
      expect(res.body.data.prioritizations[0].reasoning).toBeDefined();
    });

    it('should require manager role', async () => {
      const member = await createTestUser(tenant._id, { role: 'member' });
      const memberAuth = createAuthenticatedRequest(app, member, tenant);
      
      // Add as member to project
      project.members.push({ user: member._id, role: 'member' });
      await project.save();

      await memberAuth
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .expect(403);
    });

    it('should require AI features to be enabled', async () => {
      // Temporarily disable AI
      process.env.AI_FEATURES_ENABLED = 'false';
      
      const res = await authRequest
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .expect(403);

      expect(res.body.error.message).toContain('AI features are not enabled');
      
      // Re-enable for other tests
      process.env.AI_FEATURES_ENABLED = 'true';
    });
  });

  describe('AI Rate Limiting', () => {
    it('should rate limit AI requests', async () => {
      // Create tasks for testing
      await createTestTask(project._id, tenant._id);

      // Make requests up to the limit
      for (let i = 0; i < 50; i++) {
        await authRequest
          .post(`/api/projects/${project._id}/ai/prioritize`)
          .expect(200);
      }

      // Next request should be rate limited
      const res = await authRequest
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .expect(429);

      expect(res.body.error.message).toContain('AI request limit exceeded');
    });
  });
});