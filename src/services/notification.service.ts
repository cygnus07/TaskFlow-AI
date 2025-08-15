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
}