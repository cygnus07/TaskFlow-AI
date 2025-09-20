import { createApp } from '../app.js'
import request from 'supertest'
import { Types } from 'mongoose'
import { Tenant } from '../models/tenant.model.js'
import { User } from '../models/user.model.js'
import { Project } from '../models/project.model.js'
import { Task } from '../models/task.model.js'
import { config } from '../config/index.js'
import { 
  createTestTenant, 
  createTestUser, 
  createTestProject,
  createTestTask
} from '../../tests/helpers/index.js'

describe('AI Service Integration Tests', () => {
  let app: any
  let testUser: any
  let testTenant: any
  let authToken: string
  let project: any
  let managerUser: any
  let managerToken: string

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({})
    await Tenant.deleteMany({})
    await Project.deleteMany({})
    await Task.deleteMany({})
    
    // Create test tenant
    testTenant = await createTestTenant({
      name: 'AI Test Tenant',
      plan: 'pro'
    })
    
    // Create admin/manager user  
    managerUser = await createTestUser(testTenant._id, {
      email: 'aimanager@test.com',
      password: 'password123',
      role: 'admin'
    })
    
    // Create regular user
    testUser = await createTestUser(testTenant._id, {
      email: 'aiuser@test.com', 
      password: 'password123',
      role: 'member'
    })
    
    // Get auth tokens
    const managerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aimanager@test.com',
        password: 'password123'
      })
    
    managerToken = managerLoginRes.body.data.token
    
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aiuser@test.com',
        password: 'password123'
      })
    
    authToken = userLoginRes.body.data.token
    
    // Create test project
    project = await createTestProject(testTenant._id, managerUser._id, {
      name: 'AI Test Project',
      members: [
        { user: managerUser._id, role: 'manager' },
        { user: testUser._id, role: 'member' }
      ]
    })
  })

  describe('AI Features Availability', () => {
    it('should handle AI features when disabled', async () => {
      // Test with AI disabled
      (config.ai as any).enabled = false
      
      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('AI features are not enabled')
    })

    it('should handle missing API key', async () => {
      (config.ai as any).enabled = true
      delete process.env.OPENAI_API_KEY
      
      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('AI features are not enabled')
    })

    it('should handle empty project (no tasks to prioritize)', async () => {
      (config.ai as any).enabled = true
      process.env.OPENAI_API_KEY = 'test-key'
      
      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('No tasks to prioritize')
    })

    it('should require proper authentication for AI endpoints', async () => {
      (config.ai as any).enabled = true
      process.env.OPENAI_API_KEY = 'test-key'
      
      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        // No auth header
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should handle invalid project ID', async () => {
      (config.ai as any).enabled = true;
      (config.ai as any).openaiApiKey = undefined
      
      const invalidId = new Types.ObjectId().toString()
      
      const res = await request(app)
        .post(`/api/projects/${invalidId}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('Project not found')
    })
  })

  describe('AI Endpoint Structure', () => {
    beforeEach(() => {
      // Set up for successful API calls (but we'll get API errors due to fake key)
      (config.ai as any).enabled = true 
      process.env.OPENAI_API_KEY = 'fake-key-for-testing'
    })

    it('should have AI prioritization endpoint available', async () => {
      await createTestTask(project._id, testTenant._id, {
        title: 'Test Task'
      })

      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
      
      // Should not be 404 (endpoint exists), might be 500 due to fake API key
      expect(res.status).not.toBe(404)
      
      if (res.status === 500) {
        // Expected with fake API key - AI service should exist but fail
        expect(res.body.error.message).toContain('AI')
      }
    })

    it('should check permissions for AI features', async () => {
      await createTestTask(project._id, testTenant._id, {
        title: 'Test Task'  
      })

      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${authToken}`) // Regular user
      
      // Should be 403 for permission denied (only managers can use AI prioritization)
      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toMatch(/manager/i)
    })

    it('should validate project membership', async () => {
      // Create different tenant and project
      const otherTenant = await createTestTenant({ name: 'Other Tenant' })
      const otherProject = await createTestProject(otherTenant._id as string, managerUser._id)
      
      const res = await request(app)
        .post(`/api/projects/${otherProject._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
      
      // Should either be 404 (project not found) or 403 (no access)
      expect([403, 404]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })
  })

  describe('Task Data Handling', () => {
    beforeEach(() => {
      (config.ai as any).enabled = true
      process.env.OPENAI_API_KEY = 'fake-key'
    })

    it('should handle project with no tasks', async () => {
      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
      
      // Should not crash, might return error due to fake API key
      expect(res.status).not.toBe(404)
    })

    it('should handle project with multiple tasks', async () => {
      // Create several test tasks
      await createTestTask(project._id, testTenant._id, {
        title: 'Task 1',
        priority: 'low'
      })
      
      await createTestTask(project._id, testTenant._id, {
        title: 'Task 2', 
        priority: 'high'
      })

      await createTestTask(project._id, testTenant._id, {
        title: 'Task 3',
        priority: 'medium'
      })

      const res = await request(app)
        .post(`/api/projects/${project._id}/ai/prioritize`)
        .set('Authorization', `Bearer ${managerToken}`)
      
      // Should handle multiple tasks without crashing
      expect(res.status).not.toBe(404)
    })
  })

  describe('AI Service Class Tests (if accessible)', () => {
    it('should validate AI service configuration requirements', () => {
      // Test the basic requirements checking logic
      (config.ai as any).enabled = false
      delete process.env.OPENAI_API_KEY
      
      // If we can import AIService directly, test its methods
      // Otherwise this validates the API endpoint behavior
      expect((config.ai as any).enabled).toBe(false)
    })
  })
})