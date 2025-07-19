import { Request } from 'express'
import { IUser } from '../models/user.model.js'

export interface AuthRequest extends Request {
    user? : IUser
    tenantId?: string
}

// jwt payload structure
export interface JWTPayload {
    userId: string
    tenantId: string
    email: string
    name: string
}

// api resposne structure
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
}