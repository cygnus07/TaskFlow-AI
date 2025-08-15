import Redis from 'ioredis'
import { config } from './index.js'


class RedisClient {
    private client: Redis | null = null
    private subscriber: Redis | null = null
    private pubisher: Redis | null =null
    private isConnected = false

    async connect(): Promise<void> {
        // if already connected, return

        // create main redis client with connection url and retry config
        // set reasonalble retry limits 
        
        // create separate clients for pub/sub ops
        // pub/sub need dedicated connections that dont interfere with regular commands

        // wire up event handlers for connection status
        // log sucess and errors
        // test the connection with a ping 
        if(this.isConnected) return

        try {
            this.client = new Redis(config.redis.url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000)
                    return delay
                }
            })

            this.subscriber = new Redis(config.redis.url)
            this.pubisher = new Redis(config.redis.url)

            this.client.on('connect', () => {
                console.log('REdis connected successfully')
                this.isConnected = true
            })

            this.client.on('error', (err) => {
                console.error('Redis connection error', err)
                this.isConnected = false
            })

            await this.client.ping()


        } catch (error) {
            console.error('Failed to connect to Redis: ', error)
            throw error
        }

    }

    async disconnect(): Promise<void> {
        // if not connected return
        // close all three redis connections
        // use quit() insted of disconnect for clean shutdown
        // quit waits for pending commands to finish

        // update our connection flag so other methods know we're offline
        if(!this.isConnected) return
        try {
            if (this.client) await this.client.quit()
            if(this.subscriber) await this.subscriber.quit()
            if(this.pubisher) await this.pubisher.quit()

            this.isConnected = false
            console.log('Redis disconnected')
        } catch (error) {
            console.error('Error disconnection from Redis', error)

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
        if(!this.pubisher){
            throw new Error('Redis publisher not initialized')
        }
        return this.pubisher
    }


}

export const redisClient = new RedisClient()