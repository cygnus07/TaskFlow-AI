import { createApp } from "./app.js"
import { config } from './config/index.js'

process.on('uncaughtException', (error: Error) => {
    console.log("Uncaught Exception: ", error)
    process.exit(1)
})


process.on('unhandledRejection', (error: Error ) => {
    console.log("Unhandled Rejection: ", error)
    process.exit(1)
})

const startServer = async () => {
    try {
        const app = createApp()
        const server = app.listen(config.port, () => {
            console.log(`Server is runnning
                Environment: ${config.env}
                URL: http://localhost:${config.port}
                Health Check: http://localhost:${config.port}/health
                `)
        })

        // graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully')
            server.close( () => {
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
