import mongoose from 'mongoose'
import{ config} from '../config/index.js'

let isConnected = false

export const connectDB =async (): Promise<void> => {

    // check if the db is already connected
    // if connected return and log that there is an existing connection
    if(isConnected){
        console.log("There is already an existing mongodb connection")
        return
    }

    // create a event listener for db connected
    // create a event listener for db errror
    // create a event listener for db disconnected
    // connect to database

    try {
        mongoose.set('strictQuery', true) // strict query filtering so it throws error when invalid field query

        mongoose.connection.on('connected', () => {
            console.log("Mongodb connected successfully")
            isConnected=true
        })

        mongoose.connection.on('error', (error: Error) => {
            console.error("Mongodb connection error", error)
            isConnected=false
        })

        mongoose.connection.on('disconnected', () => {
            console.log("Mongodb disconnected")
            isConnected=false
        })

        await mongoose.connect(config.mongoose.uri, config.mongoose.options)
    } catch (error) {
        console.log("Mongodb connection failed", error)
        process.exit(1)
    }
}


export const disconnectDB = async (): Promise<void> => {
    // if isConnected is false, return
    // call the mongoose.disconnect method
    // set isConnected to false

    if(!isConnected) return;
    try {
        await mongoose.disconnect()
        console.log("MongoDb disconnected successfully")
        isConnected = false
    } catch (error) {
        console.log("Error while disconnecting MongoDb", error)

    }
}