import request from 'supertest'
import { createApp } from '../app.js'
import { 
  createTestTenant, 
  createTestUser,
  createAuthenticatedRequest 
} from '../../tests/helpers/index.js'

describe('Integration Tests', () => {
  let app: any

  beforeAll(() => {
    app = createApp()
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
    const tenant1 = await createTestTenant({ name: 'Company A' })
    const user1 = await createTestUser(tenant1._id as any)
    const auth1 = createAuthenticatedRequest(app, user1, tenant1)

    const tenant2 = await createTestTenant({ name: 'Company B' })
    const user2 = await createTestUser(tenant2._id as any)
    const auth2 = createAuthenticatedRequest(app, user2, tenant2)

    const projectRes = await auth1
      .post('/api/projects')
      .send({ name: 'Tenant 1 Project' })
      .expect(201)

    const projectId = projectRes.body.data.project._id

    await auth2
      .get(`/api/projects/${projectId}`)
      .expect(403)

    const listRes = await auth2
      .get('/api/projects')
      .expect(200)

    expect(listRes.body.data.projects).toHaveLength(0)
  })
})