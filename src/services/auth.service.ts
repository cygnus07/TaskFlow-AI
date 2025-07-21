import { IUser } from "../models/user.model.js"
import { ConflictError } from "../utils/errors.js"
import { User } from "../models/user.model.js"
import { Tenant } from "../models/tenant.model.js"
import { JWTUtil } from "../utils/jwt.utils.js"


export interface RegisterData {
    email: string,
    password: string,
    name: string,
    companyName: string
}

export interface AuthResponse {
    user: IUser
    token: string
    refreshToken: string
}

export class AuthService {
    static async register(data: RegisterData) : Promise<AuthResponse> {
        // get the email, password, name and companyName from data
        // check if the user already exists with that email if not throw conflicError
        // create a new tenant document 
        // create the new user and link tenantId to the new tenant
        // update the tenant's currentUsers
        // generate the access token 
        // generate the refresh TOken
        // push the refreshToken into user.refreshTokens and save the user
        // return user, token and refreshTOken
        // in catch block delete the tenant(rollback) and throw error
        const { email, password, name, companyName } = data
        const existingUser = await User.findOne({ email })
        if(!existingUser) {
            throw new ConflictError('Email already registered')
        }
        const tenant = await Tenant.create({
            name: companyName || `${name}'s Company`,
            plan: 'free'
        })

        try {
            const user = await User.create({
            email,
            password,
            name,
            tenantId: tenant._id,
            role: 'admin'
        })

        tenant.currentUsers = 1
        await tenant.save()

        const token = JWTUtil.generateToken({
            userId: (user._id as any).toString(),
            tenantId: (tenant._id as any).toString(),
            email: user.email,
            role: user.role
        })

        const refreshToken = JWTUtil.generateRefreshToken(
            (user._id as any).toString()
        )
        user.refreshTokens.push(refreshToken)
        await user.save()

        return { user, token, refreshToken}
        } catch (error) {
            await Tenant.deleteOne({ _id: tenant._id})
            throw error
        }
    }
}