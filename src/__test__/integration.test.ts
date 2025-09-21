import request from 'supertest'
import { createApp } from '../app.js'
import { User } from "../models/user.model.js"
import { Tenant } from "../models/tenant.model.js"
import { Project } from "../models/project.model.js"
import { 
  createTestTenant, 
  createTestUser
} from '../tests/helpers/index.js'

describe('Integration Tests', () => {
  let app: any

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(async () => {
    // Clean up database before each test to ensure isolation
    await User.deleteMany({})
    await Tenant.deleteMany({})
    await Project.deleteMany({})
  })

  it('should complete full workflow: register -> create project -> create task -> complete task', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'workflow@test.com',
        password: 'password123',
        name: 'Workflow User',
        companyName: 'Workflow Company'
      })
      .expect(201)

    const token = registerRes.body.data.token
    const userId = registerRes.body.data.user._id

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration Test Project',
        description: 'Testing full workflow'
      })
      .expect(201)

    const projectId = projectRes.body.data.project._id

    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Complete integration test',
        assignees: [userId],
        priority: 'high'
      })
      .expect(201)

    const taskId = taskRes.body.data.task._id

    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in-progress' })
      .expect(200)

    await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Working on it!' })
      .expect(200)

    const completeRes = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' })
      .expect(200)

    expect(completeRes.body.data.task.completedAt).toBeDefined()

    const finalProjectRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(finalProjectRes.body.data.project.metadata.completedTasks).toBe(1)
    expect(finalProjectRes.body.data.project.metadata.totalTasks).toBe(1)
  })

  it('should enforce tenant isolation', async () => {
    // Create first tenant and user
    const tenant1 = await createTestTenant({ name: 'Company A' })
    await createTestUser((tenant1._id as any).toString().toString(), {
      email: 'user1@company-a.com',
      password: 'password123',
      role: 'admin'
    })

    // Login as first user to get token
    const loginRes1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@company-a.com',
        password: 'password123'
      })
      .expect(200)

    const token1 = loginRes1.body.data.token

    // Create second tenant and user
    const tenant2 = await createTestTenant({ name: 'Company B' })
    await createTestUser((tenant2._id as any).toString(), {
      email: 'user2@company-b.com',
      password: 'password123',
      role: 'admin'
    })

    // Login as second user to get token
    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user2@company-b.com',
        password: 'password123'
      })
      .expect(200)

    const token2 = loginRes2.body.data.token

    // User 1 creates a project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Tenant 1 Project' })
      .expect(201)

    const projectId = projectRes.body.data.project._id

    // User 2 should NOT be able to access User 1's project
    // API might return 404 (not found in tenant scope) or 403 (forbidden)
    const accessAttempt = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token2}`)

    // Either 403 (forbidden) or 404 (not found in tenant scope) is acceptable
    expect([403, 404]).toContain(accessAttempt.status)

    // User 2's project list should be empty (no access to User 1's projects)
    const listRes = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200)

    expect(listRes.body.data.projects).toHaveLength(0)

    // User 1 should still see their own project
    const user1ListRes = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200)

    expect(user1ListRes.body.data.projects).toHaveLength(1)
    expect(user1ListRes.body.data.projects[0].name).toBe('Tenant 1 Project')
  })

  it('should prevent cross-tenant data leakage in project creation', async () => {
    // Create two separate tenants with users
    const tenant1 = await createTestTenant({ name: 'Isolated Company 1' })
    await createTestUser((tenant1._id as any).toString(), {
      email: 'isolated1@test.com',
      password: 'password123',
      role: 'admin'
    })

    const tenant2 = await createTestTenant({ name: 'Isolated Company 2' })
     await createTestUser((tenant2._id as any).toString(), {
      email: 'isolated2@test.com',
      password: 'password123',
      role: 'admin'
    })

    // Get tokens for both users
    const loginRes1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'isolated1@test.com',
        password: 'password123'
      })
      .expect(200)

    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'isolated2@test.com',
        password: 'password123'
      })
      .expect(200)

    const token1 = loginRes1.body.data.token
    const token2 = loginRes2.body.data.token

    // Each user creates projects in their own tenant
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Project A1' })
      .expect(201)

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Project A2' })
      .expect(201)

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token2}`)
      .send({ name: 'Project B1' })
      .expect(201)

    // Verify each user only sees their own tenant's projects
    const user1Projects = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200)

    const user2Projects = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200)

    expect(user1Projects.body.data.projects).toHaveLength(2)
    expect(user2Projects.body.data.projects).toHaveLength(1)

    // Check that project names match what each tenant created
    const user1ProjectNames = user1Projects.body.data.projects.map((p: any) => p.name).sort()
    const user2ProjectNames = user2Projects.body.data.projects.map((p: any) => p.name)

    expect(user1ProjectNames).toEqual(['Project A1', 'Project A2'])
    expect(user2ProjectNames).toEqual(['Project B1'])
  })
})