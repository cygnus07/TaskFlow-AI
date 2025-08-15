import { Types } from "mongoose";
import { INotification, Notification } from "../models/notification.model.js";
import { SocketService } from "./socket.service";

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
        SocketService.emitToUser(data.userId, 'notification:new', notification)

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
}