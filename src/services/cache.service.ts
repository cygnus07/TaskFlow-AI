import { config } from "../config/index.js"
import { redisClient } from "../config/redis.js"


export class CacheService {
    private static prefix = 'taskflow:'

     private static isRedisAvailable(): boolean {
        try {
            redisClient.getClient()
            return true
        } catch {
            return false
        }
    }

    static keys = {
        user: (userId: string) => `${this.prefix}user:${userId}`,
        project: (projectId: string) => `${this.prefix}project:${projectId}`,
        projectList: (tenantId: string, userId: string) => `${this.prefix}projects:${tenantId}:${userId}`,
        task: (taskId: string) => `${this.prefix}task:${taskId}`,
        taskList: (projectId: string) => `${this.prefix}tasks:${projectId}`,
        tenantStats: (tenantId:string) => `${this.prefix}stats:${tenantId}`,
        userSessions: (userId: string) => `${this.prefix}sessions:${userId}`,
        aiAnalysis: (projectId: string) => `${this.prefix}ai:analysis:${projectId}`
    }

    static async get<T>(key: string): Promise<T | null> {
        // grab redis client, might throw if not
        // get the string value from redis
        // if nothing return null

        // parse the json string back to object
        // return it with right type

        if (!this.isRedisAvailable()) {
            console.log('Redis not available, skipping cache get')
            return null
        }

        try {
            const client = redisClient.getClient()
            const data = await client.get(key)
            
            if(!data) return null
            return JSON.parse(data) as T
        } catch (error) {
            console.error('Cache get error:', error)
            return null
        }
    }   

    static async set(key: string, value: any, ttl?: number): Promise<void> {

        if (!this.isRedisAvailable()) {
            console.log('Redis not available, skipping cache set')
            return
        }

        try {
            const client = redisClient.getClient()
            const serialized = JSON.stringify(value)

            const effectiveTtl = ttl || config.redis.ttl
            
            if(effectiveTtl) {
                await client.setex(key, effectiveTtl, serialized)
            } else {
                await client.set(key, serialized)
            }
        } catch (error) {
            console.error('Cache set error:', error)
        }
    }

    static async delete(key: string | string[]): Promise<void> {
        try {
            const client = redisClient.getClient()
            const keys = Array.isArray(key) ? key: [key]

            if(keys.length > 0){
                await client.del(...keys)
            }
        } catch (error) {
            console.error('Cache delete error', error)
        }
    }

    static async deletePattern(pattern: string): Promise<void> {

                if (!this.isRedisAvailable()) return

        try {
            const client = redisClient.getClient()
            const keys = await client.keys(`${this.prefix}${pattern}`)

             if(keys.length > 0) {
                const batchSize = 100
                for(let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize)
                    await client.del(...batch)
                }
            }
        } catch (error) {
            console.error('Cache delete pattern error:', error)
        }
    }

    static async invalidateUser(userId: string): Promise<void> {
        await this.delete(this.keys.user(userId))
    }

    static async invalidateProject(projectId: string, tenantId: string): Promise<void> {
        await this.delete([
            this.keys.project(projectId),
            this.keys.taskList(projectId)
        ])

        await this.deletePattern(`projects:${tenantId}:*`)
    }

    static async invalidateTask(taskId: string, projectId: string): Promise<void> {
        await this.delete([
            this.keys.task(taskId),
            this.keys.taskList(projectId)
        ])
    }

    static async addUserSession(userId: string, sessionId: string, data: any): Promise<void> {
        try {
            const client = redisClient.getClient()
            const key = this.keys.userSessions(userId)

            await client.hset(key, sessionId, JSON.stringify(data))
            await client.expire(key, 86400*7)
        } catch (error) {
            console.error('Session add error: ', error)
        }
    }

    static async removeUserSession(userId: string, sessionId: string): Promise<void> {
        try {
            const client = redisClient.getClient()
            await client.hdel(this.keys.userSessions(userId), sessionId)
        } catch (error) {
            console.error('Session remove error: ', error)
        }
    }

    static async getUserSessions(userId: string): Promise<Record<string,any>> {
        try {
            const client = redisClient.getClient()
            const sessions = await client.hgetall(this.keys.userSessions(userId))

            const parsed: Record<string,any> = {}
            for(const [id,data] of Object.entries(sessions)){
                parsed[id] = JSON.parse(data)
            }
            return parsed
        } catch (error) {
            console.error('Session got error: ', error)
            return {}
        }
    }

    static async checkRateLimit(
        identifier: string,
        limit: number,
        window: number
    ): Promise<{allowed: boolean; remaining: number; resetAt: number}> {
        try {
            const client = redisClient.getClient()
            const key= `${this.prefix}ratelimit:${identifier}`

            const multi = client.multi()
            const now = Date.now()
            const windowStart = now - window * 1000

            multi.zremrangebyscore(key, '-inf', windowStart)

            multi.zcard(key)

            multi.zadd(key,now, `${now}-${Math.random()}`)

            multi.expire(key, window)

            const results = await multi.exec()
            const count = results?.[1]?.[1] as number || 0

            return {
                allowed: count < limit,
                remaining: Math.max(0, limit - count -1),
                resetAt: now + window*1000
            }
        } catch (error) {
            console.error('Rate limit error: ', error)
            return { allowed: true, remaining: limit, resetAt: 0}
        }
    }
}