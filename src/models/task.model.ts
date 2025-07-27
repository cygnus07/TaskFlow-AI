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
    dependecies: {
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
        min: [0, 'Actual NUmbers cannot be negative'],
        default: 0
    },
    assignees: [{
        type: Schema.Types.ObjectId,
        ref: 'User',

    }],
    dependecies: [{
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

// find all tasks filtered by status
taskSchema.index({ projectId: 1, status: 1}) 
// find all tasks assigned to a user with a status
taskSchema.index({ assignees:1 , status: 1})
// find overdue or upcoming tasks quickly
taskSchema.index({ dueDate: 1, status: 1 })
// find tasks that depend on a given task
taskSchema.index({ 'dependencies.taskId': 1})
// filter tasks by tags
taskSchema.index({ tags: 1})

taskSchema.index({ projectId: 1, parentTaskId: 1, status: 1})

taskSchema.pre('save', function(next) {
    if(this.isModified('status')){
        if(this.status === 'done' && !this.completedAt){
            this.completedAt = new Date()
        }else{
            this.completedAt = undefined
        }
    
        this.activityLog.push({
            user: this.assignees[0],
            action: 'status_changed',
            details: {
                from: this.get('status'),
                to: this.status
            },
            timestamp: new Date()
        })
    }
    


    

    next()
})

taskSchema.virtual('subtasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'parentTaskId'
})

taskSchema.methods.canStart = async function() : Promise<boolean> {
    const blockingDeps = await this.model('Task').find({
        _id: { $in: (this.dependecies as TaskDependency[]).filter(d => d.type === 'blocked-by').map(d => d.taskId)},
        status: {$ne: 'done'},
    })

    return blockingDeps === 0
}

taskSchema.methods.getAllSubtasks = async function() : Promise<ITask[]> {
    const subtasks = await this.model('Task').find({ parentTaskId: this._id})
    const allSubtasks = [...subtasks]

    for(const subtask of subtasks){
        const nestedSubtasks= await subtask.getAllsubTasks()
        allSubtasks.push(...nestedSubtasks)
    }

    return allSubtasks
}

export const task = model<ITask>('Task', taskSchema)