import { Types } from "mongoose";
import { INotification, Notification } from "../models/notification.model.js";
import { SocketService } from "./socket.service";
import { User } from "../models/user.model";

interface CreateNotificationData {
    userId: string | Types.ObjectId
    type: INotification['type']
    title: string
    message: string
    data?: any
    priority?: INotification['priority']
    tenantId: string
}

export class NotificationService {
    static async create(data: CreateNotificationData): Promise<INotification> {
        // save the notification to db using the model
        // we get the created notification with _id and timestamps

        // immediately push it out using websocket to the user
        // they'll get it real tiem if they are online

        // return the created notification 

        const notification = await Notification.create(data)
        const userIdString = typeof data.userId === 'string' ? data.userId : data.userId.toString()
        SocketService.emitToUser(userIdString, 'notification:new', notification)

        return notification
    }

    static async createBulk(
        userIds: string[],
        notificationData: Omit<CreateNotificationData, 'userId'>
    ): Promise<INotification[]> {
        // map over userIds and create notification object for each one
        // spread the common notificationData and userId for each
        // using the insertMany for efficient batch insert

        // loop through userIds and send real time notification to each
        // match up userId with notification from the barch result
        // emit to each user separately since they need their notification

        // return the array of created notifications

        const notifications = await Notification.insertMany(
            userIds.map(userId => ({
                ...notificationData,
                userId: new Types.ObjectId(userId),
            }))
        )

        userIds.forEach((userId, index) => {
            SocketService.emitToUser(userId, 'notification:new', notifications[index])
        })

        return notifications as INotification[];
    }

    static async markAsRead(
        notificationId: string,
        userId: string,
        tenantId: string
    ): Promise<INotification | null> {
        // find notification that matches id, userId and tenantId
        // update it to read true and set readAt timestamp
        // use findOneAndUpdate with new true to get back updated doc

        // send real time update to user 
        // send the notification id
        // return the updated notification or null

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId, tenantId, read: false},
            { read: true, readAt: new Date()},
            { new: true}
        )

        if(notification){
            SocketService.emitToUser(userId, 'notification:read', {
                notificationId: notification._id
            })
        }

        return notification


    }

    static async markAllAsRead(
        userId: string,
        tenantId: string
    ): Promise<number> {
        // update all unread notifications for the user
        // set read: true and readAT timestamp
        
        // if updated, send realtime event to user with count of how many wer marked read
        // reutrn count of notifications

        const result = await Notification.updateMany(
            {userId, tenantId, read: false},
            { read: true, readAt: new Date()}
        )

        if(result.modifiedCount > 0){
            SocketService.emitToUser(userId, 'notifications:all:read', {
                count: result.modifiedCount
            })
        }

        return result.modifiedCount
    }

    static async getUserNotifications (
        userId: string,
        tenantId: string,
        options: {
            unreadOnly?: boolean
            limit?: number
            skip?: number
        }
    ): Promise<{notifications: INotification[]; unreadCount: number}>{
        // build the query object starting with userId and tenantId
        // if unreadOnly flag is set, add read: false to query

        // run the two queries in parallel
        // one for notification and other fro unread ocunt
        
        // return both results as object - notification array and total unread count
        
        const query: any = { userId, tenantId}
        if(options.unreadOnly){
            query.read = false
        }

        const [ notifications, unreadCount] = await Promise.all([
            Notification.find(query)
            .sort({ createdAt: -1})
            .limit(options.limit || 50)
            .skip(options.skip || 0),
            Notification.countDocuments({ userId, tenantId, read: false})
        ])

        return { notifications, unreadCount}
    }

    static async notifyTaskAssignment(
        task: any,
        assigneeIds: string[],
        assignedBy: string,
        tenantId: string
    ){
        // fetch the user who did the assigning
        // filter out the person who did it
        // create buld notifications for all the actual assignees
        // build message with assinger name and task title
        // set prirority based on task prirorty
        // include the task and project ids

        const assigner =await User.findById(assignedBy)
        await this.createBulk(
            assigneeIds.filter( id => id !== assignedBy),
            {
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `${assigner?.name || 'Someone'} assigned you to "${task.title}"`,
                data: {
                    taskId: task._id,
                    projectId: task.projectId,
                    assignedBy,
                },
                priority: task.priority === 'urgent'? 'high' : 'medium',
                tenantId
            }
        )
    }

    static async notifyTaskCompleted(
        task: any,
        completedBy: string,
        projectMemberIds: string[],
        tenantId: string
    ){
        // get the user who completed the task
        // filter out the person who completed it
        // send notifications to all other project members
        // include task and project info in data payload

        const completer = await User.findById(completedBy)

        await this.createBulk(
            projectMemberIds.filter(id => id !== completedBy),
            {
                type: 'task_completed',
                title: 'Task ccompleted',
                message: `${completer?.name || 'Someone'} completed "${task.title}`,
                data: {
                    taskId: task._id,
                    projectId: task.projectId,
                    completedBy,
                },
                priority: 'low',
                tenantId
            }
        )
    }
}