import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'
import { addTenantIsolation, IBaseDocument } from './base.model'

export interface IUser extends IBaseDocument {
    email: string
    password: string
    name: string
    role: 'admin' | 'manager' | 'member'
    isActive: boolean
    lastLogin? : Date
    refreshTokens: string[]
    comparePassword(candidatePassword: string) : Promise<boolean>
    tenantAccess?: {
        tenantId: string
        role: string
    }[] // for future multi-tenatn access
}

const userSchema = new Schema<IUser> ({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],

    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'manager', 'member'],
            message: 'Invalid role',
        },
        default: 'member'
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
    refreshTokens: [{
        type: String,
        select: false,
    }],
    tenantAccess: [{
        tenantId: String,
        role: String,
        _id: false,
    }]
})

// tenant isolation
addTenantIsolation(userSchema)

userSchema.index({ email: 1, tenantId: 1} , {unique: true})
userSchema.index({ role: 1})
userSchema.index({ isActive: 1})

// to hash the password before saving
userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next()

        try {
            const salt = await bcrypt.genSalt(12)
            this.password = await bcrypt.hash(this.password, salt)
        } catch (error) {
            next(error as Error)
        }
})


// method to compare the passwords
userSchema.methods.comparePassword = async function(
    candidatePassword: string
) : Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password)
    } catch (error) {
        return false
    }
}

// to remove the sensitive data
userSchema.methods.toJSON = function() {
    const obj = this.toObject()
    delete obj.password
    delete obj.refreshTokens
    delete obj.__v
    return obj
}

export const User = model<IUser>('User', userSchema)