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

        // try {
        //     await redisClient.connect()
        //     console.log('Redis connected')
        // } catch (error) {
        //     console.error('Redis connection failed, continuing without it')
        // }

        const httpServer = createServer(app)
        SocketService.initialize(httpServer)

        // Use Railway's PORT environment variable or fallback to config
        const port = Number(process.env.PORT) || config.port
        const host:string = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'

        httpServer.listen(port, host, () => {
            console.log(`
🚀 Server is running
Environment: ${config.env}
Port: ${port}
Host: ${host}
Health check: /health
Database: connected
Websocket: Ready
Railway URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not available'}`)
        })

        // graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully')
            httpServer.close(async () => {
                await disconnectDB()
                try {
                    await redisClient.disconnect()
                } catch (error) {
                    console.log('Redis disconnect error (expected if not connected)')
                }
                console.log("Server closed")
                process.exit(0)
            })
        })
    } catch (error) {
        console.error("Failed to start server", error)
        process.exit(1)
    }
}

startServer()