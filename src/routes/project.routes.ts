import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { ProjectController } from "../controllers/project.controller.js";


const router = Router()

router.use(authenticate)


router.post('/', ProjectController.create)
router.get('/', ProjectController.findAll)
router.get('/:id', ProjectController.findById)
router.put('/:id', ProjectController.update)
router.delete('/:id', ProjectController.delete)

router.post('/:id/members', ProjectController.addMember)
router.delete('/:id/members/:id', ProjectController.removeMember)

export default router
