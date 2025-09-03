import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";


const router = Router()

router.post('/register',authRateLimit, AuthController.register)
router.post('/login',authRateLimit, AuthController.login)
router.post('/refresh-token',authRateLimit, AuthController.refreshToken)

// protected routes
router.post('/logout', authenticate, AuthController.logout)
router.get('/me', authenticate, AuthController.me)


export default router