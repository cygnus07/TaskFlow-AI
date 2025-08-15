import { Router } from "express";
import authRoutes from './auth.routes.js'
import projectRoutes from './project.routes.js'
import taskRoutes from './task.routes.js'
import aiRoutes from './ai.routes.js'
import { config } from "../config/index.js";
import notificationRoutes from './notification.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/', taskRoutes)
router.use('/', aiRoutes)
router.use('/', notificationRoutes)


router.get('/health', (_req,res) => {
    res.json({
        success: true,
        message: 'Api is running',
        timeStamp: new Date().toISOString(),
        features: {
            ai: config.ai.enabled
        }
    })
})

export default router

