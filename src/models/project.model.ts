import { model, Schema, Types } from "mongoose";
import { addTenantIsolation, IBaseDocument } from "./base.model";


export interface IProject extends IBaseDocument {
    name: string
    description: string
    status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
    prioprity : 'low' | 'medium' | 'high' | 'urgent'
    startDate?: Date
    endDate?: Date
    owner: Types.ObjectId
    members: {
        user: Types.ObjectId
        role: 'manager' | 'member'
        joinedAt: Date
    }[]
    settings: {
        isPrivate: boolean
        allowedMemberInvite: boolean
    }
    metadata: {
        totalTasks: number
        completedTasks: number
        overdueTasks: number
        lastActivityAt: Date
    }

}




const projectSchema = new Schema<IProject> ({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Project description cannot exceed 500 characters']
    },
    status: {
        type: String,
        enum: {
            values: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
            message: 'Invalid project status'
        },
        default: 'planning'
    },
    prioprity: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'priority'],
            message: 'invalid priority level'
        },
        default: 'medium'
    },
    startDate: Date,
    endDate: Date,
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['manager', 'member'],
            default:'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },

    }],
    settings: {
        isPrivate: {
            type: Boolean,
            default: false,
        },
        allowedMemberInvite: {
            type: Boolean,
            default: true,
        },
    },
    metadata: {
        totalTasks: {
            type: Number,
            default: 0
        },
        completedTasks: {
            type: Number,
            default: 0
        },
        overdueTasks: {
            type: Number,
            default: 0
        },
        lastActivityAt: {
            type: Date,
            default: Date.now
        }
    }
})

addTenantIsolation(projectSchema)


projectSchema.index({ status:1, tenantId: 1})
projectSchema.index({ owner:1, tenantId: 1})
projectSchema.index({ 'members.user': 1})
projectSchema.index({ createdAt: -1, tenantId: 1})


// to check that endDate must be after startDate
projectSchema.pre('save', function(next) {
    if(this.startDate && this.endDate && this.endDate < this.startDate){
        return next(new Error('End date must be after start date'))
    }
    next()
})

// to check if user is a member
projectSchema.methods.isMember = function(userId: string) : boolean {
    return this.members.some((member: any) => 
    member.user.toString() === userId ||
    this.owner.toString() === userId
) 
}


// method to get member role
projectSchema.methods.getMemberRole = function(userId: string) : string | null {
    if(this.owner.toString() === userId) return 'manager'
    const member = this.members.find((m: any) =>
    m.user.toString() === userId
)

    return member ? member.role : null
}


projectSchema.virtual('progress').get(function() {
    if(this.metadata.totalTasks === 0) return 0
    return Math.round((this.metadata.completedTasks / this.metadata.totalTasks) * 100)
})


export const Project = model<IProject>('Project', projectSchema)