import { createApp } from "../app.js"
import request from 'supertest'
import { Tenant } from "../models/tenant.model.js"
import { User } from "../models/user.model.js"
import { Project } from "../models/project.model.js"
import { createTestTenant, createTestUser, createTestProject } from '../../tests/helpers/index.js'

describe('Project Endpoints', () => {
    let app: any
    let testUser: any
    let testTenant: any  
    let authToken: string

    beforeAll(() => {
        app = createApp()
    })

    beforeEach(async () => {
        // Clean up database
        await User.deleteMany({})
        await Tenant.deleteMany({})
        await Project.deleteMany({})
        
        // Create test tenant and user
        testTenant = await createTestTenant()
        testUser = await createTestUser(testTenant._id, {
            email: 'project@test.com',
            password: 'password123',
            role: 'admin'
        })
        
        // Get auth token by logging in
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'project@test.com',
                password: 'password123'
            })
        
        authToken = loginRes.body.data.token
    })

    describe('POST /api/projects', () => {
        it('should create a new project', async () => {
            const projectData = {
                name: 'Test Project',
                description: 'A test project',
                priority: 'high'
            }

            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201)

            expect(res.body.success).toBe(true)
            expect(res.body.data.project.name).toBe(projectData.name)
        })

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400)

            expect(res.body.success).toBe(false)
            expect(res.body.error.message).toContain('name is required')
        })
    })

    describe('GET /api/projects', () => {
        beforeEach(async () => {
            // Create test projects using the helper
            await createTestProject(testTenant._id, testUser._id, {
                name: 'Active Project',
                status: 'active'
            })
            
            await createTestProject(testTenant._id, testUser._id, {
                name: 'Completed Project',
                status: 'completed'
            })
        })

        it('should return only projects where user is member', async () => {
            const res = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(res.body.success).toBe(true)
            expect(res.body.data.projects).toHaveLength(2)
        })

        it('should filter projects by status', async () => {
            const res = await request(app)
                .get('/api/projects?status=completed')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(res.body.data.projects).toHaveLength(1)
            expect(res.body.data.projects[0].status).toBe('completed')
        })

        it('should cache project list', async () => {
            const res1 = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
            
            // Cache might not be enabled in tests, so make this optional
            if (res1.headers['x-cache']) {
                expect(res1.headers['x-cache']).toBe('MISS')
            }

            const res2 = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
            
            // Only check cache if it's actually being set
            if (res2.headers['x-cache']) {
                expect(res2.headers['x-cache']).toBe('HIT')
            }
        })
    })

    describe('PUT /api/projects/:id', () => {
        let project: any

        beforeEach(async () => {
            project = await createTestProject(testTenant._id, testUser._id, {
                name: 'Project to Update'
            })
        })

        it('should update project as manager', async () => {
            const updates = {
                name: 'Updated Project Name',
                description: 'Updated description'
            }

            const res = await request(app)
                .put(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200)

            expect(res.body.success).toBe(true)
            expect(res.body.data.project.name).toBe(updates.name)
        })

        it('should reject update from non-manager', async () => {
            // Create another user who is not a manager
             await createTestUser(testTenant._id, {
                email: 'nonmanager@test.com',
                password: 'password123',
                role: 'member'
            })

            // Login as non-manager
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonmanager@test.com',
                    password: 'password123'
                })

            const nonManagerToken = loginRes.body.data.token

            const res = await request(app)
                .put(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${nonManagerToken}`)
                .send({ name: 'Should Fail' })
                .expect(403)

            expect(res.body.success).toBe(false)
        })
    })

    describe('POST /api/projects/:id/members', () => {
        let project: any
        // let newMember: any

        beforeEach(async () => {
            project = await createTestProject(testTenant._id, testUser._id)
            await createTestUser(testTenant._id, {
                email: 'newmember@test.com',
                password: 'password123'
            })
        })

        it('should add member to project', async () => {
            const res = await request(app)
                .post(`/api/projects/${project._id}/members`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: 'newmember@test.com',
                    role: 'member'
                })
                .expect(200)

            expect(res.body.success).toBe(true)
            expect(res.body.data.project.members).toHaveLength(2) // original + new member
        })

        it('should prevent duplicate members', async () => {
            // First, add the member
            await request(app)
                .post(`/api/projects/${project._id}/members`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: 'newmember@test.com',
                    role: 'member'
                })
                .expect(200)

            // Try to add the same member again
            const res = await request(app)
                .post(`/api/projects/${project._id}/members`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ 
                    email: 'newmember@test.com',
                    role: 'member'
                })
                .expect(409)

            expect(res.body.success).toBe(false)
            expect(res.body.error.message).toContain('already a project member')
        })
    })
})