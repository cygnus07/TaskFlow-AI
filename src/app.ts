import express, {Application, Request, Response, NextFunction} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import {config} from './config/index.js'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import morgan from 'morgan'
import routes from './routes/index.js'
import { errorHandler } from './middleware/error.middleware.js'
import { apiRateLimit } from './middleware/rateLimit.middleware.js'



export const createApp = (): Application => {
    const app = express()
    app.use(helmet())
    app.use(cors(config.cors))

    app.use('/api', apiRateLimit)
    app.use(express.json({ limit: '10mb'}))
    app.use(express.urlencoded({
        extended: true,
        limit: '10mb'
    }))
    app.use(cookieParser())
    app.use(compression())

    if(config.env != 'test'){
        app.use(morgan('dev'))
    }

    app.get('/', (_req:Request, res: Response) => {
        res.status(200).json({
            status: 'ok',
            message: 'Api running'
        })
    })

    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({
            status: 'ok',
            timeStamp: new Date().toISOString(),
            environment: config.env,
        })
    }) 

    // api routes
    app.use('/api', routes)

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction ) => {
        console.error(err.stack)
        res.status(500).json({
            status: 'error',
            message: config.env === 'production'
            ? "Internal Server Error" 
            : err.message
        })
    })

    // global error handler
    app.use(errorHandler)

    return app
}