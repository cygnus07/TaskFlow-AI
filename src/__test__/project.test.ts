import { createApp } from '../app.js'
import { 
  createTestTenant, 
  createTestUser, 
  createTestProject,
  createAuthenticatedRequest 
} from '../../tests/helpers/index.js'

describe('Project Endpoints', () => {
  let app: any
  let authRequest: any
  let tenant: any
  let user: any

  beforeAll(async () => {
    app = createApp()
    tenant = await createTestTenant()
    user = await createTestUser(tenant._id, { role: 'admin' })
    authRequest = createAuthenticatedRequest(app, user, tenant)
  })

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        priority: 'high',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }

      const res = await authRequest
        .post('/api/projects')
        .send(projectData)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.project.name).toBe(projectData.name)
      expect(res.body.data.project.owner).toBe(user._id.toString())
      expect(res.body.data.project.members).toHaveLength(1)
    })

    it('should validate required fields', async () => {
      const res = await authRequest
        .post('/api/projects')
        .send({})
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('name is required')
    })
  })

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      await createTestProject(tenant._id, user._id, { name: 'Project 1' })
      await createTestProject(tenant._id, user._id, { name: 'Project 2' })
      
      const otherUser = await createTestUser(tenant._id)
      await createTestProject(tenant._id, otherUser._id.toString(), { name: 'Other Project' })
    })

    it('should return only projects where user is member', async () => {
      const res = await authRequest
        .get('/api/projects')
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.projects).toHaveLength(2)
      expect(res.body.data.projects.every((p: any) => 
        p.name !== 'Other Project'
      )).toBe(true)
    })

    it('should filter projects by status', async () => {
      await createTestProject(tenant._id, user._id, { 
        name: 'Completed Project',
        status: 'completed' 
      })

      const res = await authRequest
        .get('/api/projects?status=completed')
        .expect(200)

      expect(res.body.data.projects).toHaveLength(1)
      expect(res.body.data.projects[0].status).toBe('completed')
    })

    it('should cache project list', async () => {
      const res1 = await authRequest
        .get('/api/projects')
        .expect(200)
      expect(res1.headers['x-cache']).toBe('MISS')

      const res2 = await authRequest
        .get('/api/projects')
        .expect(200)
      expect(res2.headers['x-cache']).toBe('HIT')
    })
  })

  describe('PUT /api/projects/:id', () => {
    let project: any

    beforeEach(async () => {
      project = await createTestProject(tenant._id, user._id)
    })

    it('should update project as manager', async () => {
      const updates = {
        name: 'Updated Name',
        status: 'on-hold'
      }

      const res = await authRequest
        .put(`/api/projects/${project._id}`)
        .send(updates)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.project.name).toBe(updates.name)
      expect(res.body.data.project.status).toBe(updates.status)
    })

    it('should reject update from non-manager', async () => {
      const member = await createTestUser(tenant._id)
      const memberAuth = createAuthenticatedRequest(app, member, tenant)

      project.members.push({ user: member._id, role: 'member' })
      await project.save()

      await memberAuth
        .put(`/api/projects/${project._id}`)
        .send({ name: 'Should Fail' })
        .expect(403)
    })
  })

  describe('POST /api/projects/:id/members', () => {
    let project: any
    let newMember: any

    beforeEach(async () => {
      project = await createTestProject(tenant._id, user._id)
      newMember = await createTestUser(tenant._id, {
        email: 'newmember@test.com'
      })
    })

    it('should add member to project', async () => {
      const res = await authRequest
        .post(`/api/projects/${project._id}/members`)
        .send({
          email: 'newmember@test.com',
          role: 'member'
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.project.members).toHaveLength(2)
    })

    it('should prevent duplicate members', async () => {
      await authRequest
        .post(`/api/projects/${project._id}/members`)
        .send({ email: 'newmember@test.com' })

      const res = await authRequest
        .post(`/api/projects/${project._id}/members`)
        .send({ email: 'newmember@test.com' })
        .expect(409)

      expect(res.body.error.message).toContain('already a project member')
    })
  })
})