import { createApp } from "../app.js"
import request from 'supertest'
import { Types } from 'mongoose'
import { Tenant } from "../models/tenant.model.js"
import { User } from "../models/user.model.js"
import { Project } from "../models/project.model.js"
import { Task } from "../models/task.model.js"
import { createTestTenant, createTestUser, createTestProject, createTestTask } from '../../tests/helpers/index.js'

describe('Task Endpoints', () => {
  let app: any
  let testUser: any
  let testTenant: any
  let authToken: string
  let project: any

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({})
    await Tenant.deleteMany({})
    await Project.deleteMany({})
    await Task.deleteMany({})
    
    // Create test tenant and user
    testTenant = await createTestTenant()
    testUser = await createTestUser(testTenant._id, {
      email: 'task@test.com',
      password: 'password123',
      role: 'admin'
    })
    
    // Get auth token by logging in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'task@test.com',
        password: 'password123'
      })
    
    authToken = loginRes.body.data.token
    console.log(authToken)
    
    // Create test project
    project = await createTestProject(testTenant._id, testUser._id, {
      name: 'Test Project'
    })
  })

  describe('POST /api/projects/:projectId/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'A test task',
        priority: 'medium',
        assignees: [testUser._id.toString()]
      }

      const res = await request(app)
        .post(`/api/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.task.title).toBe(taskData.title)
    })

    it('should create subtask with parent', async () => {
      const parentTask = await createTestTask(project._id, testTenant._id, {
        title: 'Parent Task'
      })

      const res = await request(app)
        .post(`/api/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Child Task',
          parentTaskId: (parentTask._id as Types.ObjectId).toString()
        })
        .expect(201)

      expect(res.body.data.task.parentTaskId).toBe((parentTask._id as Types.ObjectId).toString())
    })

    it('should validate assignees are project members', async () => {
      // Create user who is NOT a member of the project
      const nonMember = await createTestUser(testTenant._id, {
        email: 'nonmember@test.com',
        password: 'password123'
      })

      const res = await request(app)
        .post(`/api/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task with invalid assignee',
          assignees: [nonMember._id.toString()]
        })
        .expect(400)

      expect(res.body.error.message).toContain('must be project members')
    })
  })

  describe('Task Dependencies', () => {
    let task1: any
    let task2: any

    beforeEach(async () => {
      task1 = await createTestTask(project._id, testTenant._id, {
        title: 'Task 1'
      })
      task2 = await createTestTask(project._id, testTenant._id, {
        title: 'Task 2'
      })
    })

    it('should add task dependency', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dependencyTaskId: task2._id.toString(),
          type: 'blocked-by'
        })
        .expect(200)

      expect(res.body.data.task.dependencies).toHaveLength(1)
      expect(res.body.data.task.dependencies[0].type).toBe('blocked-by')
    })

    it('should prevent self-dependency', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dependencyTaskId: task1._id.toString(),
          type: 'blocks'
        })
        .expect(400)

      expect(res.body.error.message).toContain('Task cannot be same as dependency task')
    })

    it('should remove dependency', async () => {
      // First add a dependency
      await request(app)
        .post(`/api/tasks/${task1._id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dependencyTaskId: task2._id.toString(),
          type: 'blocked-by'
        })

      // Then remove it
      const res = await request(app)
        .delete(`/api/tasks/${task1._id}/dependencies/${task2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body.data.task.dependencies).toHaveLength(0)
    })
  })

  describe('Task Status Updates', () => {
    let task: any

    beforeEach(async () => {
      task = await createTestTask(project._id, testTenant._id, {
        title: 'Status Test Task'
      })
    })

    it('should update task status', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in-progress' })
        .expect(200)

      expect(res.body.data.task.status).toBe('in-progress')
    })

    it('should set completedAt when marked done', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(200)

      expect(res.body.data.task.status).toBe('done')
      expect(res.body.data.task.completedAt).toBeDefined()
    })

    it('should update project metadata on completion', async () => {
      // Complete the task
      await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(200)

      // Check project metadata
      const projectRes = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(projectRes.body.data.project.metadata.completedTasks).toBeGreaterThan(0)
    })
  })

  describe('Task Comments', () => {
    let task: any

    beforeEach(async () => {
      task = await createTestTask(project._id, testTenant._id, {
        title: 'Comment Test Task'
      })
    })

    it('should add comment to task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'This is a test comment' })
        .expect(200)

      expect(res.body.data.task.comments).toHaveLength(1)
      expect(res.body.data.task.comments[0].text).toBe('This is a test comment')
    })

    it('should require comment text', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })
})