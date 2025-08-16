import { NextFunction } from "express"
import { CacheService } from "../services/cache.service"


interface CacheOptions {
    key: (req: Request) => string
    ttl?: number
    condition?: (req: Request) => boolean
}

export const cache = (options: CacheOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if(req.method !== 'GET'){
            return next()
        }

        if(options.condition && !options.condition(req)) {
            return next()
        }

        const cacheKey = options.key(req)
        try {
            const cached = await CacheService.get(cacheKey)

            if(cached){
                res.setHeader('X-Cache', 'HIT')
                return res.json(cached)
            }

            const originalJson = res.json.bind(res)
            res.json = (data: any) => {
                res.setHeader('X-Cache', 'MISS')

                if(res.statusCode >= 200 && res.statusCode < 300){
                    CacheService.set(cacheKey, data, options.ttl).catch(err => 
                        console.error('Cache set error: ', err)
                    )
                }

                return originalJson(data)
            }

            next()
        } catch (error) {
            console.error('Cache middleware error: ', error)
            next()
        }
    }
}