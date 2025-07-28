import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { TaskController } from "../controllers/task.controller.js";

const router  = Router()

router.use(authenticate)

// crud ops
router.get('/projects/:projectId/tasks', TaskController.findByProject)
router.post('/projects/:projectId/tasks', TaskController.create)
router.get('/tasks/:id', TaskController.findById)
router.put('/tasks/:id', TaskController.update)
router.delete('/tasks/:id', TaskController.delete)

// task ops
router.patch('/tasks/:id/status', TaskController.updateStatus)
router.get('/tasks/:id/subtasks', TaskController.getSubtasks)

// dependencies
router.post('/tasks/:id/dependencies', TaskController.addDependency)
router.delete('/tasks/:id/dependencies/:dependencyId', TaskController.removeDependency)

// comment
router.post('/tasks/:id/comments', TaskController.addComment)

export default router