import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../types/index.js'
import { CacheService } from '../services/cache.service.js'
import { AppError } from '../utils/errors.js'

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req)
    const identifier = `api:${req.path}:${key}`

    try {
      const { allowed, remaining, resetAt } = await CacheService.checkRateLimit(
        identifier,
        max,
        Math.floor(windowMs / 1000)
      )

      res.setHeader('X-RateLimit-Limit', max)
      res.setHeader('X-RateLimit-Remaining', remaining)
      res.setHeader('X-RateLimit-Reset', new Date(resetAt).toISOString())

      if (!allowed) {
        res.setHeader('Retry-After', Math.floor((resetAt - Date.now()) / 1000))
        return next(new AppError(message, 429))
      }

      if (skipSuccessfulRequests || skipFailedRequests) {
            const originalEnd = res.end.bind(res)

            res.end = ((...args: Parameters<typeof res.end>): ReturnType<typeof res.end> => {
            const shouldSkip =
                (skipSuccessfulRequests && res.statusCode < 400) ||
                (skipFailedRequests && res.statusCode >= 400)

            if (shouldSkip) {
                CacheService.checkRateLimit(
                identifier,
                max + 1,
                Math.floor(windowMs / 1000)
                )
            }

            return originalEnd(...args)
            }) as typeof res.end

      }

      next()
    } catch (error) {
      console.error('Rate limit error:', error)
      next()
    }
  }
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
    keyGenerator: (req) => {
    const authReq = req as AuthRequest
    return authReq.user ? `user:${authReq.user._id}` : req.ip || 'unknown'
    }
})

export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'AI request limit exceeded. Please try again later.',
    keyGenerator: (req) => {
    const authReq = req as AuthRequest
    return authReq.user ? `user:${authReq.user._id}` : req.ip || 'unknown'
    }
})
