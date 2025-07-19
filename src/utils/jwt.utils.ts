import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types/index.js';
import { config } from '../config/index.js';


export class JWTUtil {
    static generateToken(payload: JWTPayload) : string {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expire as any
        }) 
    }

    static generateRefreshToken(userId: string): string {
        return jwt.sign({userId, type: 'refresh' }, config.jwt.secret,{
            expiresIn: '30d'
        })
    }

    static verifyToken(token: string) : JWTPayload {
        return jwt.verify(token, config.jwt.secret) as JWTPayload
    }

    static decodeToken(token: string) : JWTPayload | null {
        try {
            return jwt.decode(token) as JWTPayload
        } catch (error) {
            return null
        }
    }
}
