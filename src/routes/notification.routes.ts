import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { AuthRequest } from "../types/index.js";
import { NotificationService } from "../services/notification.service.js";


const router = Router()

router.use(authenticate)

router.get('/notifications', async (req: AuthRequest, res, next) => {
    try {
        const { unreadOnly, limit, skip } = req.query

        const result = await NotificationService.getUserNotifications(
            req.user!._id.toString(),
            req.tenantId!,
            {
                unreadOnly: unreadOnly === 'true',
                limit: limit ? parseInt(limit as string) : undefined,
                skip: skip ? parseInt(skip as string) : undefined,
            }
        )

        res.json({
            success: true,
            data: result
        })
    } catch (error) {
        next(error)
    }
})

router.put('/notifications/:id/read', async (req: AuthRequest, res, next) => {
    try {
        const notification = await NotificationService.markAsRead(
            req.params.id,
            req.user!._id.toString(),
            req.tenantId!
        )

        res.json({
            success: true,
            data: { notification }
        })
    } catch (error) {
        next(error)
    }
})

router.put('/notifications/read-all', async (req: AuthRequest, res, next) => {
    try {
        const count = await NotificationService.markAllAsRead(
            req.user!._id.toString(),
            req.tenantId!
        )
        res.json({
            success: true,
            data: { count },
            message: `Marked ${count} notificatins as read`
        })
    } catch (error) {
        next(error)
    }
})

export default router