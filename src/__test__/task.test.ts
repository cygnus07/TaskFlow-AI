import { createApp } from '../app.js'
import { 
  createTestTenant, 
  createTestUser, 
  createTestProject,
  createTestTask,
  createAuthenticatedRequest 
} from '../../tests/helpers/index.js'
import { Types } from 'mongoose'

describe('Task Endpoints', () => {
  let app: any
  let authRequest: any
  let tenant: any
  let user: any
  let project: any

  beforeAll(async () => {
    app = createApp()
    tenant = await createTestTenant()
    user = await createTestUser(tenant._id, { role: 'admin' })
    authRequest = createAuthenticatedRequest(app, user, tenant)
    project = await createTestProject(tenant._id, user._id)
  })

  describe('POST /api/projects/:projectId/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'high',
        dueDate: '2024-12-31',
        estimatedHours: 5,
        assignees: [user._id.toString()],
        tags: ['important', 'backend']
      }

      const res = await authRequest
        .post(`/api/projects/${project._id}/tasks`)
        .send(taskData)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.task.title).toBe(taskData.title)
      expect(res.body.data.task.projectId).toBe(project._id.toString())
      expect(res.body.data.task.assignees).toHaveLength(1)
    })

    it('should create subtask with parent', async () => {
      const parentTask = await createTestTask(project._id, tenant._id)

      const res = await authRequest
        .post(`/api/projects/${project._id}/tasks`)
        .send({
          title: 'Subtask',
          parentTaskId: (parentTask._id as Types.ObjectId).toString()
        })
        .expect(201)

      expect(res.body.data.task.parentTaskId).toBe((parentTask._id as Types.ObjectId).toString())
    })

    it('should validate assignees are project members', async () => {
      const nonMember = await createTestUser(tenant._id)

      const res = await authRequest
        .post(`/api/projects/${project._id}/tasks`)
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
      task1 = await createTestTask(project._id, tenant._id, { title: 'Task 1' })
      task2 = await createTestTask(project._id, tenant._id, { title: 'Task 2' })
    })

    it('should add task dependency', async () => {
      const res = await authRequest
        .post(`/api/tasks/${task1._id}/dependencies`)
        .send({
          dependencyTaskId: task2._id.toString(),
          type: 'blocked-by'
        })
        .expect(200)

      expect(res.body.data.task.dependencies).toHaveLength(1)
      expect(res.body.data.task.dependencies[0].type).toBe('blocked-by')
    })

    it('should prevent self-dependency', async () => {
      const res = await authRequest
        .post(`/api/tasks/${task1._id}/dependencies`)
        .send({
          dependencyTaskId: task1._id.toString(),
          type: 'blocks'
        })
        .expect(400)

      expect(res.body.error.message).toContain('cannot depend on itself')
    })

    it('should remove dependency', async () => {
      await authRequest
        .post(`/api/tasks/${task1._id}/dependencies`)
        .send({
          dependencyTaskId: task2._id.toString(),
          type: 'blocked-by'
        })

      const res = await authRequest
        .delete(`/api/tasks/${task1._id}/dependencies/${task2._id}`)
        .expect(200)

      expect(res.body.data.task.dependencies).toHaveLength(0)
    })
  })

  describe('Task Status Updates', () => {
    let task: any

    beforeEach(async () => {
      task = await createTestTask(project._id, tenant._id)
    })

    it('should update task status', async () => {
      const res = await authRequest
        .patch(`/api/tasks/${task._id}/status`)
        .send({ status: 'in-progress' })
        .expect(200)

      expect(res.body.data.task.status).toBe('in-progress')
    })

    it('should set completedAt when marked done', async () => {
      const res = await authRequest
        .patch(`/api/tasks/${task._id}/status`)
        .send({ status: 'done' })
        .expect(200)

      expect(res.body.data.task.status).toBe('done')
      expect(res.body.data.task.completedAt).toBeDefined()
    })

    it('should update project metadata on completion', async () => {
      await authRequest
        .patch(`/api/tasks/${task._id}/status`)
        .send({ status: 'done' })

      const projectRes = await authRequest
        .get(`/api/projects/${project._id}`)
        .expect(200)

      expect(projectRes.body.data.project.metadata.completedTasks).toBeGreaterThan(0)
    })
  })

  describe('Task Comments', () => {
    let task: any

    beforeEach(async () => {
      task = await createTestTask(project._id, tenant._id)
    })

    it('should add comment to task', async () => {
      const res = await authRequest
        .post(`/api/tasks/${task._id}/comments`)
        .send({ text: 'This is a test comment' })
        .expect(200)

      expect(res.body.data.task.comments).toHaveLength(1)
      expect(res.body.data.task.comments[0].text).toBe('This is a test comment')
    })

    it('should require comment text', async () => {
      await authRequest
        .post(`/api/tasks/${task._id}/comments`)
        .send({})
        .expect(400)
    })
  })
})