import request from 'supertest';
import { createApp } from '../app.js';

describe('E2E: Complete User Journey', () => {
  let app: any;
  let authToken: string;
  let userId: string;
  // let tenantId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(() => {
    app = createApp();
  });

  test('Complete user journey from registration to task completion', async () => {
    // Step 1: Register new user
    console.log('Step 1: Registering user...');
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'password123',
        name: 'E2E Test User',
        companyName: 'E2E Test Company',
      })
      .expect(201);

    authToken = registerRes.body.data.token;
    userId = registerRes.body.data.user._id;
    
    // Step 2: Verify user can access their profile
    console.log('Step 2: Verifying profile access...');
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Step 3: Create a project
    console.log('Step 3: Creating project...');
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E Test Project',
        description: 'Testing complete workflow',
        priority: 'high',
      })
      .expect(201);

    projectId = projectRes.body.data.project._id;

    // Step 4: Add a team member
    console.log('Step 4: Adding team member...');
    // First create another user in the same tenant
     await request(app)
      .post('/api/auth/register')
      .send({
        email: 'member2@test.com',
        password: 'password123',
        name: 'Team Member',
      })
      .expect(201);

    // Then add them to the project
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: 'member2@test.com',
        role: 'member',
      })
      .expect(200);

    // Step 5: Create tasks
    console.log('Step 5: Creating tasks...');
    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Main task',
        description: 'This is the main task',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        assignees: [userId],
        tags: ['important', 'e2e-test'],
      })
      .expect(201);

    taskId = taskRes.body.data.task._id;

    // Create subtask
    await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Subtask',
        parentTaskId: taskId,
      })
      .expect(201);

    // Step 6: Update task progress
    console.log('Step 6: Updating task progress...');
    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'in-progress' })
      .expect(200);

    // Step 7: Add comment
    console.log('Step 7: Adding comment...');
    await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Started working on this task' })
      .expect(200);

    // Step 8: Use AI to analyze project (if enabled)
    // if (process.env.AI_FEATURES_ENABLED === 'true') {
    //   console.log('Step 8: Running AI analysis...');
    //   await request(app)
    //     .post(`/api/projects/${projectId}/ai/analyze-health`)
    //     .set('Authorization', `Bearer ${authToken}`)
    //     .expect(200);
    // }

    // Step 9: Complete task
    console.log('Step 9: Completing task...');
    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'done' })
      .expect(200);

    // Step 10: Verify project stats updated
    console.log('Step 10: Verifying project stats...');
    const finalProjectRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(finalProjectRes.body.data.project.metadata.completedTasks).toBeGreaterThan(0);
    expect(finalProjectRes.body.data.project.metadata.totalTasks).toBeGreaterThan(0);

    console.log('E2E test completed successfully!');
  });
});