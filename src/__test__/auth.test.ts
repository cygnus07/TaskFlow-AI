import { createApp } from "../app.js"
import request from 'supertest'
import { Tenant } from "../models/tenant.model.js"
import { User } from "../models/user.model.js"
import { createTestTenant, createTestUser } from '../tests/helpers/index.js'



describe('Auth Endpoints', () => {
    let app: any

    beforeAll( () => {
        app = createApp()
    })

    describe('POST /api/auth/register', () => {
        it('should register a new user with tenant', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                companyName: 'Test Company'
            }

            const res = await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect(201)

            expect(res.body.success).toBe(true)
            expect(res.body.data.user.email).toBe(userData.email)
            expect(res.body.data.token).toBeDefined()

            const tenant = await Tenant.findOne({ name: userData.companyName })
            expect(tenant).toBeDefined()
            expect(tenant?.plan).toBe('free')

            const user = await User.findOne({ email: userData.email})
            expect(user?.role).toBe('admin')
        })

        it('should reject duplicate email registration', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'password123',
                name: 'Test User'
            }

            await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect(201)

        

            const res = await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect(409)

            expect(res.body.success).toBe(false)
            expect(res.body.error.message).toContain('already registered')
        })

        it('should validate required fields', async () => {
            const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com'
            })
            .expect(400)

          expect(res.body.success).toBe(false)
        })

    })

    describe('POST /api/auth/login', () => {
        let testUser: any
        let testTenant: any

        beforeEach(async () => {
            testTenant = await createTestTenant()
            testUser = await createTestUser(testTenant._id, {
                email: 'login@example.com',
                password: 'password123'
            })
        })

        it('should login with valid credentials', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login@example.com',
                password: 'password123'
            })
            .expect(200)

            expect(res.body.success).toBe(true)
            expect(res.body.data.user.email).toBe('login@example.com')
            expect(res.body.data.token).toBeDefined()
            expect(res.headers['set-cookie']).toBeDefined()
        })

        it('should reject invalid password', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login@example.com',
                password: 'wrongpassword'
            })
            .expect(401)

            expect(res.body.success).toBe(false)
            expect(res.body.error.message).toContain('Invalid credentials')
        })

        it('should reject non-existent user', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            })
            .expect(401)

            expect(res.body.success).toBe(false)
        })

        it('should reject inactive user', async () => {
            await User.updateOne(
                { _id: testUser._id},
                { isActive: false}
            )

            const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login@example.com',
                password: 'password123'
          })
          .expect(401)

          expect(res.body.error.message).toContain('deactivated')
        })


    })

    describe('GET /api/auth/me', () => {
        it('should return current user with valid token', async () => {
            const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'me@example.com',
                password: 'password123',
                name: 'Me User'
            })

            const token = registerRes.body.data.token

            const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

            expect(res.body.success).toBe(true)
            expect(res.body.data.user.email).toBe('me@example.com')
        })

        it('should reject request without token', async () => {
            await request(app)
            .get('/api/auth/me')
            .expect(401)
        })

        it('should reject invalid token', async () => {
            await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer invalid-token`)
            .expect(401)
        })
    })


    describe('Rate Limiting', () => {
        it('should rate limit login attempts', async () => {
            for(let i=0;i<5;++i){
                await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'ratelimit@example.com',
                    password: 'wrongpassword'
                })
            }

            const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'ratelimit@example.com',
                password: 'wrongpassword'
            })
            .expect(429)

            expect(res.body.error.message).toContain('Too many')
            expect(res.headers['x-ratelimit-remaining']).toBe('0')
        })
    })

})