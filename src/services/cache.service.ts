import { config } from "../config/index.js"
import { redisClient } from "../config/redis.js"


export class CacheService {
    private static prefix = 'taskflow'

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

        try {
            const client = redisClient.getClient()
            const data = await client.get(key)

            if(!data) return null
            return JSON.parse(data) as T
        } catch (error) {
            console.error('Cache get error: ', error)
            return null
        }
    }   

    static async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const client = redisClient.getClient()
            const serialized = JSON.stringify(value)

            if(ttl || config.redis.ttl){
                await client.setex(key,ttl || config.redis.ttl, serialized)
            } else{
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
        try {
            const client = redisClient.getClient()
            const keys = await client.keys(`${this.prefix}${pattern}`)

            if(keys.length >0) await client.del(...keys)
        } catch (error) {
            console.error('Cache delete pattern error:', error)
        }
    }
}