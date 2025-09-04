import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
    NODE_ENV: z.enum(['development','test','production']).default('development'),
    PORT: z.coerce.number().default(3000),
    MONGO_URI: z.string().startsWith('mongodb').url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRE: z.string().default('7d'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
    AI_FEATURES_ENABLED: z.string().transform(val => val === 'true').default('false'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    CACHE_TTL: z.coerce.number().default(3600)
})


console.log('🔍 Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI starts with mongodb:', process.env.MONGO_URI?.startsWith('mongodb'));
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);


let envVars;
try {
    envVars = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
} catch (error) {
    console.error('❌ Environment validation failed:', (error as any).errors)
    process.exit(1)
}

export const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    mongoose: {
        uri: envVars.MONGO_URI,
        options: {
            maxPoolSize: 10,
        },
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        expire: envVars.JWT_EXPIRE,
    },
    cors: {
        origin: envVars.NODE_ENV === 'production'
        ? ["https://taskflow-ai-production.up.railway.app", "https://taskflow.kuldeepdev.me"]
        : 'http://localhost:3000',
        credentials: true
    },
    ai: {
        enabled: envVars.AI_FEATURES_ENABLED,
        openaiApiKey: envVars.OPENAI_API_KEY,
        model: envVars.OPENAI_MODEL
    },
    redis: {
        url: envVars.REDIS_URL,
        ttl: envVars.CACHE_TTL
    }
} as const