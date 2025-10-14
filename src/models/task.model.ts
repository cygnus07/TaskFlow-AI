import { model, Schema, Types } from "mongoose";
import { addTenantIsolation, IBaseDocument } from "./base.model.js";

export interface ITask extends IBaseDocument{
    projectId: Types.ObjectId
    parentTaskId?: Types.ObjectId
    title: string
    description?: string
    status: 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: Date
    startDate?: Date
    completedAt?: Date
    estimatedHours?: number
    actualHours?: number
    assignees: Types.ObjectId[]
    dependencies: {
        taskId: Types.ObjectId
        type: 'blocks' | 'blocked-by'
    }[]
    tags: string[]
    attachements: {
        filename: string
        url: string
        uploadedBy: Types.ObjectId
        uploadedAt: Date
    }[]
    comments: {
        user: Types.ObjectId
        text: string
        createdAt: Date
    }[]
    activityLog: {
        user: Types.ObjectId
        action: string
        details?: any
        timestamp: Date
    }[]
    aiMetaData?: {
        suggestedPriority?: string
        suggestedDueDate?: Date
        priorityScore?: number
        complexityScore?: number
        lastAnalyzedAt?: Date
    }
}

interface TaskDependency {
    taskId: Types.ObjectId,
    type: 'blocks' | 'blocked-by'
}

const taskSchema = new Schema<ITask>({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
    },
    parentTaskId: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        index: true
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: {
            values: ['todo', 'in-progress', 'review', 'done', 'cancelled'],
            message: 'Invalid task status'
        },
        default: 'todo'
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: 'Invalid priority'
        },
        default: 'medium'
    },
    dueDate: {
        type: Date,
    },
    startDate: {
        type: Date,
    },
    completedAt: {
        type: Date
    },
    estimatedHours: {
        type: Number,
        min: [0, 'Estimated hours cannot be negative']
    },
    actualHours: {
        type: Number,
        min: [0, 'Actual hours cannot be negative'],
        default: 0
    },
    assignees: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    dependencies: [{
        taskId: {
            type: Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        type: {
            type: String,
            enum: ['blocks', 'blocked-by'],
            required: true
        }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
    }],
    attachements: [{
        filename: String,
        url: String,
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    activityLog: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            required: true,
        },
        details: Schema.Types.Mixed,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    aiMetaData: {
        suggestedPriority: String,
        suggestedDueDate: Date,
        priorityScore: Number,
        complexityScore: Number,
        lastAnalyzedAt: Date
    }
})

addTenantIsolation(taskSchema)

// Indexes for performance optimization
taskSchema.index({ projectId: 1, status: 1}) 
taskSchema.index({ assignees: 1, status: 1})
taskSchema.index({ dueDate: 1, status: 1 })
taskSchema.index({ 'dependencies.taskId': 1})
taskSchema.index({ tags: 1})
taskSchema.index({ projectId: 1, parentTaskId: 1, status: 1})

// Pre-save middleware with proper user context handling
taskSchema.pre('save', function(next) {
    if(this.isModified('status')){
        if(this.status === 'done' && !this.completedAt){
            this.completedAt = new Date()
        } else if(this.status !== 'done') {
            this.completedAt = undefined
        }
    
        // Only add activity log if we have a valid user context
        // This should be set from the service layer before saving using task._modifiedBy
        if((this as any)._modifiedBy) {
            this.activityLog.push({
                user: (this as any)._modifiedBy,
                action: 'status_changed',
                details: {
                    from: this.get('status'),
                    to: this.status
                },
                timestamp: new Date()
            })
        }
    }
    
    next()
})

// Virtual for subtasks
taskSchema.virtual('subtasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'parentTaskId'
})

// Instance method to check if task can start (no blocking dependencies)
taskSchema.methods.canStart = async function(){
    const blockingDeps = await this.model('Task').find({
        _id: { 
            $in: (this.dependencies as TaskDependency[])
                .filter(d => d.type === 'blocked-by')
                .map(d => d.taskId)
        },
        status: { $ne: 'done' },
    })

    return blockingDeps.length === 0
}

// Instance method to get all subtasks recursively
taskSchema.methods.getAllSubtasks = async function(): Promise<ITask[]> {
    const subtasks = await this.model('Task').find({ parentTaskId: this._id })
    const allSubtasks = [...subtasks]

    for(const subtask of subtasks){
        const nestedSubtasks = await subtask.getAllSubtasks()
        allSubtasks.push(...nestedSubtasks)
    }

    return allSubtasks
}

export const Task = model<ITask>('Task', taskSchema)