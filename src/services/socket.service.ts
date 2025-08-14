import { Server as HttpServer} from 'http'
import { Server as SocketServer, Socket} from 'socket.io'
import { config } from '../config/index.js'
import { JWTUtil } from '../utils/jwt.utils.js'
import { User } from '../models/user.model.js'


export class SocketService {
    private static io: SocketService
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
}