import { Tenant } from '../../src/models/tenant.model.js'
import { faker } from '@faker-js/faker'
import { User } from '../../src/models/user.model.js'
import { Project } from '../../src/models/project.model.js'
import { Task } from '../../src/models/task.model.js'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'

export const createTestTenant = async (data?: Partial<any>) => {
    return await Tenant.create({
        name: faker.company.name(),
        plan: 'pro',
        isActive: true,
        ...data
    })
}

export const createTestUser = async (tenantId: string, data?: Partial<any>) => {
    return await User.create({
        email: faker.internet.email(),
        password: 'password123',
        name: faker.person.fullName(),
        tenantId,
        role: 'member',
        isActive: true,
        ...data
    })
}

export const createTestProject = async (
    tenantId: string,
    ownerId: string,
    data?: Partial<any>
) => {
    return await Project.create({
        name: faker.company.catchPhrase(),
        description: faker.lorem.paragraph(),
        tenantId,
        owner: ownerId,
        status: 'active',
        priority: 'medium',
        members: [{ user: ownerId, role: 'manager'}],
        ...data
    })
}

export const createTestTask = async(
    projectId: string,
    tenantId: string,
    data?:Partial<any>
) => {
    return await Task.create({
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        projectId,
        tenantId,
        status: 'todo',
        priority: 'medium',
        ...data
    })
}

export const generateAuthToken = (user: any, tenant: any) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            tenantId: tenant._id.toString(),
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1d'} 
    ) 
}

export const createAuthenticatedRequest = (app: any, user: any, tenant: any) => {
    const token = generateAuthToken(user, tenant)
    const agent = supertest.agent(app)
    
    // Set default authorization header for all requests from this agent
    agent.auth = (token: string, _options: any) => {
        return agent.set('Authorization', `Bearer ${token}`)
    }
    
    // Store auth info on the agent for reference
    (agent as any).authInfo = { user, tenant, token }
    
    // Override the agent's methods to automatically include the auth header
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const
    methods.forEach(method => {
        const original = (agent as any)[method].bind(agent)
        ;(agent as any)[method] = (url: string) => {
            return original(url).set('Authorization', `Bearer ${token}`)
        }
    })
    
    return agent
}