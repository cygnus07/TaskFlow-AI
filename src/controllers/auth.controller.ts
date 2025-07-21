import { NextFunction } from "express";
import { ValidationError } from "../utils/errors.js";
import { AuthService } from "../services/auth.service.js";
import { Request, Response  } from "express";
import { AuthRequest } from "../types/index.js";

export const tokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7*24*60*60*1000
}
export const refreshTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30*24*60*60*1000
}


export class AuthController {
    static async register(req: Request, res: Response, next: NextFunction){
        try {
            // get the email, password, name and companyName from req.body
            // validate the input
            // call auth service for user and tenant creation
            // set token cookie and refreshToken cookie
            // send 201 json response

            const { email, password, name, companyName} = req.body
            if(!email || !password || !name ){
                throw new ValidationError('Email, password and name are required')
            }
            if(password.length < 8){
                throw new ValidationError('Password must be at least 8 characters')
            }

           const result =  await AuthService.register({
                email,
                password,
                name,
                companyName
            })

            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7*24*60*60*1000 
            })

            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30*24*60*60*1000
            })

            res.status(201).json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token
                },
                message: 'Registration successful'
            })



        } catch (error) {
            next(error)
        }
    }

    static async login(req: Request, res: Response, next: NextFunction){
        try {
            // get email and password from the req.body
            // validate both the inputs
            // call authservice.login 
            // set the cookies
            // send json response
            const { email, password } = req.body
            if(!email || !password) {
                throw new ValidationError('All fields are required')
            }
            const result = await AuthService.login({
                email,
                password
            })

            res.cookie('token', result.token,{
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7*24*60*60*1000
            })

            res.cookie('refreshToken', result.refreshToken,{
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30*24*60*60*1000
            })

            res.json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token
                },
                message: 'Login successful'
            })
        } catch (error) {
            next(error)
        }
    }

    static async logout (req: AuthRequest, res: Response, next: NextFunction){
        // get the refresh token from cookies
        // if req.user exists call authservice.logout with userId and refreshToken
        // clear cookeis 
        // give a success message
        try {
            const refreshToken = req.cookies.refreshToken
            if(req.user){
                await AuthService.logout((req.user._id as any).toString(), refreshToken)
            }
    
            res.clearCookie('token')
            res.clearCookie('refreshToken')
    
            res.json({
                success: true,
                message: 'Logout successfull'
            })
        } catch (error) {
            next(error)
        }
    }

    static async refreshToken(req: Request, res: Response, next:NextFunction) {
        // get the refreshToken from the cookies
        // check if it is present if not throw error
        // call authService.refreshToken 
        // set new cookies
        // give a success response
        try {
            const {refreshToken} = req.cookies
            if(!refreshToken){
                throw new ValidationError('Invalid token')
            }
            const result = await AuthService.refreshToken(refreshToken)
    
            res.cookie('token', result.token, tokenOptions)
            res.cookie('refreshToken', result.refreshToken, refreshTokenOptions)
            res.json({
                success: true,
                data: {
                    token: result.token
                },
                message: 'Token refreshed successfully'
            })
        } catch (error) {
            next(error)
        }
        
    }

    static async me(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if(!req.user){
                throw new ValidationError('User not found')
            }
            res.json({
                success: true,
                data: {
                    user: req.user
                }
            })
        } catch (error) {
            next(error)
        }
    }
}