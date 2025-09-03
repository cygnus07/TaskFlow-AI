import { createApp } from "./app.js"
import { config } from './config/index.js'
import { connectDB, disconnectDB } from "./config/database.js"
import { createServer } from "http"
import { SocketService } from "./services/socket.service.js"
import { redisClient } from "./config/redis.js"

process.on('uncaughtException', (error: Error) => {
    console.log("Uncaught Exception: ", error)
    process.exit(1)
})


process.on('unhandledRejection', (error: Error ) => {
    console.log("Unhandled Rejection: ", error)
    process.exit(1)
})

const startServer = async () => {
           const app = createApp()
            try {

            await connectDB()

            try {

                        await redisClient.connect()
                        console.log('Redis connected')
                
            } catch (error) {
                console.error('Redis connection failed, continuing without it')
            }

        const httpServer = createServer(app)

        SocketService.initialize(httpServer)

        httpServer.listen(config.port, "0.0.0.0", () => {
        console.log(`
            🚀 Server is running
            Environment: ${config.env}
            Port: ${config.port}
            Health check: /health
            Database: connected
            Websocket: Ready`)
        })

        // graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully')
            httpServer.close(async () => {
                await disconnectDB()
                await redisClient.disconnect()
                console.log("Server closed")
                process.exit(0)
            })
        })
    } catch (error) {
        console.error("Failed to start a server", error)
        process.exit(1)
    }
}


startServer()
