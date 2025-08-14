import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { checkAIEnabled } from "../middleware/ai.middleware.js";
import { AIController } from "../controllers/ai.controller.js";


const router = Router()
router.use(authenticate)
router.use(checkAIEnabled)

router.post('/project/:projectId/ai/prioritize', AIController.prioritizeTasks)
router.post('/projects/:projectId/ai/schedule', AIController.generateSchedule)
router.post('/projects/:projectId/ai/analyze-health', AIController.analyzeProjectHealth)
router.post('/projects/:projectId/ai/batch-optimize', AIController.batchOptimize)
router.post('/taks/:taskId/ai/suggest-next', AIController.suggestNextTasks)

export default router
