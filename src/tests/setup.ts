import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { redisClient } from '../config/redis.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    process.env.MONGO_URI = mongoUri;
    // Use mock Redis URL for testing (won't actually connect in test environment)
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.NODE_ENV = 'test';
    process.env.AI_FEATURES_ENABLED = 'false';

    await mongoose.connect(mongoUri);

    // Try to connect to Redis, but don't fail if unavailable
    try {
        await redisClient.connect();
    } catch (error) {
        console.warn('Redis not available in test environment, continuing without cache');
    }
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Flush Redis cache if connected
    try {
        const client = redisClient.getClient();
        if (client && client.isOpen) {
            await client.flushall();
        }
    } catch (error) {
        // Redis not available, skip
    }
});

afterAll(async () => {
    await mongoose.disconnect();

    try {
        await redisClient.disconnect();
    } catch (error) {
        // Redis not available, skip
    }

    await mongoServer.stop();
});

// Mock console methods to reduce noise during tests
const originalConsole = global.console;

global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};