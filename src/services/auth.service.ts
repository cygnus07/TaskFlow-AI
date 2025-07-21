import { IUser } from "../models/user.model.js"
import { AuthenticationError, ConflictError } from "../utils/errors.js"
import { User } from "../models/user.model.js"
import { Tenant } from "../models/tenant.model.js"
import { JWTUtil } from "../utils/jwt.utils.js"


export interface RegisterData {
    email: string,
    password: string,
    name: string,
    companyName: string
}

export interface LoginData {
    email: string
    password: string
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

    static async login(data: LoginData) : Promise<AuthResponse> {
        // get the email and password from data
        // find the user by email
            // include the refreshToken and password fields
            // if user not found throw authenticationError
        // compare the passwords
        // check if user is inactive if not throw error
        // find tenant by user.tenantId 
            // if not found or inactive throw error
        // update user.lastLogin = new DAte()
        // generate a new access token 
            // payload - userId, tenantId, email, role
        // generate a new refresh TOken
        // push the new refreshToken into user.refreshTOkens
            // keep th eonly last 5 refresh tokesn to limit sessions
        // save the user
        // return {user, token, refreshToken}

        const {email, password} = data
        const user = await User.findOne({ email }).select('+refreshTokens, password')
        if(!user) {
            throw new AuthenticationError('User not found')
        }

        const isValidPassword = await user.comparePassword(password)
        if(!isValidPassword){
            throw new AuthenticationError("Invalid credentials")
        }

        if(!user.isActive){
            throw new AuthenticationError('Account is deacctivated')
        }

        const tenant = await Tenant.findById(user.tenantId)
        if(!tenant || !tenant.isActive) {
            throw new AuthenticationError('Organization is not active')
        }

        user.lastLogin = new Date()

        const token = JWTUtil.generateToken({
            userId: (user._id as any).toString(),
            tenantId: (user.tenantId as any).toString(),
            email: user.email,
            role: user.role,
        })

        const refreshToken = JWTUtil.generateRefreshToken((user._id as any).toString())

        user.refreshTokens.push(refreshToken)
        if(user.refreshTokens.length > 5){
            user.refreshTokens = user.refreshTokens.slice(-5)
        }

        await user.save()

        return { user, token, refreshToken}
    }
}