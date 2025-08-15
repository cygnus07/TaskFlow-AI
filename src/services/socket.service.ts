import { Server as HttpServer} from 'http'
import { Server as SocketServer, Socket} from 'socket.io'
import { config } from '../config/index.js'
import { JWTUtil } from '../utils/jwt.utils.js'
import { User } from '../models/user.model.js'


interface AuthenticatedSocket extends Socket {
    userId: string
    tenantId: string
    projectRooms: Set<string>
}


export class SocketService {
    private static io: SocketServer
    private static userSockets: Map<string, Set<string>> = new Map()
    private static socketUsers: Map<string, string> = new Map()

    static initialize(server: HttpServer): SocketServer {
        // create new socketId server instance with http server
        // pass cors config and transport options
        // set up auth middleware
        // then set up event listeners
        // return the server instance 
        this.io = new SocketServer(server, {
            cors: config.cors,
            transports: ['websocket', 'polling']
        })

        this.setupMiddleware()
        this.setupEventHandlers()

        return this.io
    }

    private static setupMiddleware() {
        // grab the token from auth object or auth header
        // strip out Bearer if present
        // if no token, reject it immediately

        // decode the jwt and get userId
        // hit the database to make sure user exists and is active
        // cast socket to our custom type so we can attach user data
        // initialize empty set for tracking which project rooms they r in
        this.io.use(async (socket: Socket, next) => {
            try {
                const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace('Bearer ','')
                if(!token){
                    return next(new Error('Authentication required'))
                }

                const decoded = JWTUtil.verifyToken(token)
                const user = await User.findById(decoded.userId)
                if(!user || !user.isActive){
                    return next(new Error('Invalid user'))
                }

                const authSocket = socket as AuthenticatedSocket
                authSocket.userId = decoded.userId
                authSocket.tenantId = decoded.tenantId
                authSocket.projectRooms = new Set()

                next()
            } catch (error) {
                next(new Error('Authenticaton failed'))
            }
        })
        
    }

    private static setupEventHandlers(){
        // listen for new connections coming ing
        // when someone connects, cast to authenticated socket type

        // add this socket to our tracking maps so we know who's online
        // put them in their tenant room automatically 

        // set up listener for when they want to join a specific project
        // need to validate they actually have access to that project
        // add them to the project room and trackt it in their projectrooms set
        // tell everyone else in the project someone joined
        // send them back who else is currently online in that project

        // set up listener for leaving projects
        // remove from room, remove from tracking set
        // notify others they left

        // handle typing start/stop events
        // figure out if it's project-level or task level typing
        // broadcast to the right room but dont send back to sender

        // when they discoonect, clean up everything
        // remove from all our tracking maps
        // notify all project rooms 

        this.io.on('connection', (socket: Socket) => {
            const authSocket = socket as AuthenticatedSocket
            console.log(`User ${authSocket.userId} connected`)

            this.addUserSocket(authSocket.userId, socket.id)

            // joining the project roooms
            socket.on('join:project',async(projectId: string) => {
                try {
                    const room = `project:${projectId}`
                    await socket.join(room)
                    authSocket.projectRooms.add(projectId)

                    socket.to(room).emit('user:joined', {
                        userId: authSocket.userId,
                        projectId,
                    })

                    const onlineUsers = this.getProjectOnlineUsers(projectId)
                    socket.emit('project:users:online', { projectId, users: onlineUsers})
                } catch (error) {
                    socket.emit('error', { message: 'Failed to join project'})
                }
            })

            // leaving project rooms
            socket.on('leave:project', async (projectId: string) => {
                const room = `project:${projectId}`
                await socket.leave(room)
                authSocket.projectRooms.delete(projectId)

                socket.to(room).emit('user:left', {
                    userId: authSocket.userId,
                    projectId,
                })
            })

            // typing indicators
            socket.on('typing:start', (data: { projectId: string, taskId?: string}) => {
                const room = data.taskId ? `task:${data.taskId}` : `project:${data.projectId}`
                socket.to(room).emit('user:typing', {
                    userId: authSocket.userId,
                    ...data
                })
            })

            socket.on('typing:stop', (data: { projectId: string, taskId?: string}) => {
                const room = data.taskId ? `task:${data.taskId}` : `project:${data.projectId}`
                socket.to(room).emit('user:stopped:typring', {
                    userId: authSocket.userId,
                    ...data
                })
            })

            socket.on('disconnect', () => {
                console.log(`User ${authSocket.userId} disconnected` )
                this.removeUserSocket(authSocket.userId, socket.id)

                authSocket.projectRooms.forEach(projectId => {
                    socket.to(`project:${projectId}`).emit('user:left', {
                        userId: authSocket.userId,
                        projectId
                    })
                })
            })
        })
    }

    static emitToProject(projectId: string, event: string, data: any){
        this.io.to(`project:${projectId}`).emit(event,data)
    }

    static emitToTenant(tenantId: string, event: string, data: any){
        this.io.to(`tenant:${tenantId}`).emit(event, data)
    }

    static emitToUser(userId: string, event: string, data: any){
        const socketIds = this.userSockets.get(userId)
        if(socketIds){
            socketIds.forEach(socketId => {
                this.io.to(socketId).emit(event,data)
            })
        }
    }

    static notifyTaskCreated(task: any, projectId: string){
        this.emitToProject(projectId, 'task:created', {
            task,
            projectId,
            timestamp: new Date()
        })
    }

    static notifyTaskUpdated(task: any, projectId: string, changes: any){
        this.emitToProject(projectId, 'task:updated', {
            task,
            changes,
            projectId,
            timestamp: new Date()
        })
    }

    static notifyTaskDeleted(taskId: string, projectId: string){
        this.emitToProject(projectId, 'task:deleted', {
            taskId,
            projectId,
            timestamp: new Date()
        })
    }

    static notifyTaskAssigned(task: any, assigneeId: string, projectId: string) {
        this.emitToProject(projectId, 'task:assigned', {
            task,
            assigneeId,
            timestamp: new Date()
        })

        this.emitToUser(assigneeId, 'task:assigned:you', {
            task,
            projectId,
            timestamp: new Date()
        })
    }

    static notifyCommentAdded(taskId: string, comment: any, projectId: string){
        this.emitToProject(projectId, 'comment:added', {
            taskId,
            comment,
            projectId,
            timestamp: new Date()
        })
    }

    static notifyProjectUpdated(project: any){
        this.emitToProject(project._id.toString(), 'project:updated', {
            project,
            timestamp: new Date()
        })
    }

    static notifyProjectMemberAdded(projectId: string, member: any){
        this.emitToProject(projectId, 'project:member:added', {
            member,
            projectId,
            timestamp: new Date()
        })

        this.emitToUser(member.user.toString(), 'project:added:you', {
            projectId,
            timestamp: new Date()
        })
    }

    private static addUserSocket(userId: string, socketId: string){
        if(!this.userSockets.has(userId)){
            this.userSockets.set(userId, new Set())
        }
        this.userSockets.get(userId)!.add(socketId)
        this.socketUsers.set(socketId, userId)
    }

    private static getProjectOnlineUsers(projectId: string): string[] {
        const room = this.io.sockets.adapter.rooms.get(`project:${projectId}`)
        if(!room) return []

        const userIds = new Set<string>()
        room.forEach(socketId => {
            const userId = this.socketUsers.get(socketId)
            if(userId) userIds.add(userId)
        })

        return Array.from(userIds)
    }

    private static removeUserSocket(userId: string, socketId: string){
        const sockets = this.userSockets.get(userId)
        if(sockets){
            sockets.delete(socketId)
            if(sockets.size === 0){
                this.userSockets.delete(userId)
            }
        }
        this.socketUsers.delete(socketId)
    }

    static getIO(): SocketServer {
        return this.io
    }
}