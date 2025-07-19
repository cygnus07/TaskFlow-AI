import dotenv from 'dotenv'
import { z } from 'zod'


dotenv.config()

const envSchema = z.object({
    NODE_ENV: z.enum(['development','test','production']).default('development'),
    PORT: z.string().transform(Number).default(3000),
    MONGODB_URI: z.string().startsWith('mongodb').url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRE: z.string().default('7d')

})



// to parse and validate the envs
const envVars = envSchema.parse(process.env)

export const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    mongoose: {
        uri: envVars.MONGODB_URI,
        options: {
            maxPoolSize: 10,
            // serverSelectionTimeout: 5000,
        },
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        expire: envVars.JWT_EXPIRE,
    },
    cors: {
        origin: envVars.NODE_ENV === 'production'
        ? "the custome domain" 
        : 'http://localhost:3001',
        credentials: true
    },

}as const

export type Config = typeof config