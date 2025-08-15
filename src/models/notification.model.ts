import { addTenantIsolation, IBaseDocument } from "./base.model.js";
import { model, Schema, Types } from 'mongoose'



export interface INotification extends IBaseDocument {
    userId: Types.ObjectId
    type: 'task_assigned' | 'task_completed' | 'comment_mention' | 'project_update' | 'deadline_reminder'
    title: string 
    message: string
    read: boolean
    readAt?: Date
    data: {
        projectId?: string
        taskId?: string
        commentId: string
        [key: string]: any
    }
    priority: 'low' | 'medium' | 'high'
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['task_assigned', 'task_completed', 'comment_mention', 'project_update', 'deadline_reminder'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: Date,
    data: {
        type: Schema.Types.Mixed,
        default: {}
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }

})

addTenantIsolation(notificationSchema)

notificationSchema.index({ userId: 1, read: 1, createdAt: 1})
notificationSchema.index({ createdAt: -1})

export const Notification = model<INotification>('Notification', notificationSchema)