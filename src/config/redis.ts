import Redis from 'ioredis'
import { config } from './index.js'

class RedisClient {
    private client: Redis | null = null
    private subscriber: Redis | null = null
    private publisher: Redis | null = null
    private isConnected = false

    async connect(): Promise<void> {
        if(this.isConnected) return

        try {
            // Upstash-optimized configuration
            const redisOptions = {
                maxRetriesPerRequest: 3,
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000)
                    return delay
                },
                // Important for Upstash
                enableOfflineQueue: false,
                // Upstash connections auto-close after inactivity
                keepAlive: 10000,
                // Add connection timeout
                connectTimeout: 10000,
                // Enable auto-pipelining for better performance
                enableAutoPipelining: true,
            }

            this.client = new Redis(config.redis.url, redisOptions)
            this.subscriber = new Redis(config.redis.url, redisOptions)
            this.publisher = new Redis(config.redis.url, redisOptions)

            this.client.on('connect', () => {
                console.log('✅ Redis connected to Upstash successfully')
                this.isConnected = true
            })

            this.client.on('error', (err) => {
                console.error('❌ Redis connection error:', err)
                this.isConnected = false
            })

            this.client.on('close', () => {
                console.log('Redis connection closed')
                this.isConnected = false
            })

            // Test connection
            await this.client.ping()
            console.log('✅ Redis ping successful')

        } catch (error) {
            console.error('Failed to connect to Redis:', error)
            // Don't throw - allow app to run without cache
            this.isConnected = false
        }
    }

    // Rest of your methods remain the same...
    async disconnect(): Promise<void> {
        if(!this.isConnected) return
        try {
            if (this.client) await this.client.quit()
            if(this.subscriber) await this.subscriber.quit()
            if(this.publisher) await this.publisher.quit()

            this.isConnected = false
            console.log('Redis disconnected')
        } catch (error) {
            console.error('Error disconnecting from Redis', error)
        }
    }

    getClient(): Redis {
        if(!this.client || !this.isConnected){
            throw new Error('Redis not connected')
        }
        return this.client
    }

    getSubscriber(): Redis {
        if(!this.subscriber){
            throw new Error('Redis subscriber not initialized')
        }
        return this.subscriber
    }

    getPublisher(): Redis {
        if(!this.publisher){
            throw new Error('Redis publisher not initialized')
        }
        return this.publisher
    }

    // Add a helper to check connection status
    isReady(): boolean {
        return this.isConnected && this.client !== null
    }
}

export const redisClient = new RedisClient()