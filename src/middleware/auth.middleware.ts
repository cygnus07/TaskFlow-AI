import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/index.js";
import jwt from 'jsonwebtoken'
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { JWTUtil } from "../utils/jwt.utils.js";
import { User } from "../models/user.model.js";



export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    // get the token from the cookie or auth header
    // if token not present throw an error
    // verify the token using verify token utils
    // find the user in db using the decoder userId
    // if user not found or inactive throw authentiation error
    // verify the tenant with user's tenant
    // attach user & tenant id to request 

    try {
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
        if(!token){
            throw new AuthenticationError('token not provided')
        }

        const decoded = JWTUtil.verifyToken(token)
        const user =await User.findById(decoded.userId).select('+refreshTokens')

        if(!user || !user.isActive){
            throw new AuthorizationError('User not found or inactive')
        }

        if(user.tenantId.toString() !== decoded.tenantId){
            throw new AuthenticationError('Invalid tenant Access')
        }

        req.user = user
        req.tenantId= decoded.tenantId

    } catch (error) {
        if(error instanceof jwt.JsonWebTokenError){
            next(new AuthenticationError('Invalid Token'))
        }
        else{
            next(error)
        }
    }

}


export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if(!req.user){
            return next(new AuthenticationError('Authentication Required'))
        }

        if(!roles.includes(req.user.role)){
            return next(new AuthorizationError(
                `Role '${req.user.role}' is not authorized for this action` 
            ))
        }

        next()
    }
}


export const ensureTenant = (req: AuthRequest, _res: Response, next: NextFunction) => {
    if(!req.tenantId){
        return next(new AuthenticationError('Tenant context Required'))
    }

    next()
}
