import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { cache, invalidateCache } from '../middleware/cache.middleware.js'
import { CacheService } from '../services/cache.service.js'

const router = Router()

router.use(authenticate)

router.get('/',
  cache({
    key: (req) => CacheService.keys.projectList(
      (req as any).tenantId,
      (req as any).user._id
    ),
    ttl: 300,
  }),
  ProjectController.findAll
)

router.get('/:id',
  cache({
    key: (req) => CacheService.keys.project(req.params.id),
    ttl: 600,
  }),
  ProjectController.findById
)

router.post('/',
  invalidateCache((req) =>
    CacheService.keys.projectList((req as any).tenantId, (req as any).user._id)
  ),
  ProjectController.create
)

router.put('/:id',
  invalidateCache((req) => [
    CacheService.keys.project(req.params.id),
    CacheService.keys.projectList((req as any).tenantId, (req as any).user._id),
  ]),
  ProjectController.update
)

router.delete('/:id',
  invalidateCache((req) => [
    CacheService.keys.project(req.params.id),
    CacheService.keys.projectList((req as any).tenantId, (req as any).user._id),
  ]),
  ProjectController.delete
)

router.post('/:id/members',
  invalidateCache((req) => CacheService.keys.project(req.params.id)),
  ProjectController.addMember
)

router.delete('/:id/members/:memberId',
  invalidateCache((req) => CacheService.keys.project(req.params.id)),
  ProjectController.removeMember
)

export default router
