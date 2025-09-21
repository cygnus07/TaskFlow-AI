import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { RedisMemoryServer } from "redis-memory-server";
import { redisClient } from '../config/redis.js';

let mongoServer: MongoMemoryServer;
let redisServer: RedisMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    redisServer = new RedisMemoryServer();
    const redisHost = await redisServer.getHost();
    const redisPort = await redisServer.getPort();

    process.env.MONGO_URI = mongoUri;
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.NODE_ENV = 'test';

    await mongoose.connect(mongoUri);
    await redisClient.connect();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    const client = redisClient.getClient();
    await client.flushall();
});

afterAll(async () => {
    await mongoose.disconnect();
    await redisClient.disconnect();
    await mongoServer.stop();
    await redisServer.stop();
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