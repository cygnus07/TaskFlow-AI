import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/index.js";
import {  ValidationError } from "../utils/errors.js";
import { ProjectService } from "../services/project.service.js";


export class ProjectController {
    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // extract project data from request body
            // destructure name, description, priority, startDate, endDate

            const { name, description, priority, startDate, endDate} = req.body

            // validate required fields
            // if name is missing throw validation error
            if(!name){
                throw new ValidationError('Project name is required')
            }

            // call ProjectService.create with extracted data
            // pass user id from req.usr._id and tenantId from req.tenantId

          

            const project = await ProjectService.create(
                {name, description, priority, startDate, endDate},
            req.user!._id.toString(),
            req.tenantId!
        )
        // send success response with 201 status
        // return project data with success message

        res.status(201).json({
            success: true,
            data: { project },
            message: 'Project created successfully'
        })

        } catch (error) {
            next(error)
        }
    }

    static async findAll(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // extract filter params from query stirng
            // get status, priority, serach from req.query

            const { status, priority, search} = req.query

            // call ProjectService.findAll with filters
            // pass tenantId and userId from request
            // pass filters object with extracted query params

            const projects = await ProjectService.findAll(
                req.tenantId!,
                req.user!._id.toString(),
                {
                    status: status as string,
                    priority: priority as string,
                    search: search as string,
                }
            )

            // send success response with projects array
            // include projects data and count in response

            res.json({
                success: true,
                data: {
                    projects,
                    count: projects.length
                }
            })
        } catch (error) {
            next(error)
        }
    }

    static async findById(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // extract projectId from route paramters
            // get id from req.params

            const {id} = req.params

            // call ProjectService.findById to get single project
            // pass project id, tenatndId , and userId from req

            const project = await ProjectService.findById(
                id,
                req.tenantId!,
                req.user!._id.toString(),
            )

            // send success response with project data

            res.json({
                success: true,
                data: { project }
            })
        } catch (error) {
            next(error)
        }
    }

    static async update (req: AuthRequest, res: Response, next: NextFunction){
        try {
            // extract projecId from route req.params
            const {id} = req.params
            
            // extract updated data from req.body
            const updates = req.body

            // call ProjectService.update to modify project
            // pass project id, updates, userId and tenantId

            const project = await ProjectService.update(
                id,
                updates,
                req.user!._id.toString(),
                req.tenantId!,
            )

            // sebd success response with udpated project
            res.json({
                success: true,
                data: {project},
                message: 'Project updated successfully'
            })
        } catch (error) {
            next(error)
        }
    }

    static async delete (req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get project id from req.params
            // call ProjectService.delete to remove project
            // pass project id, userId, and tenantId
            // send success reposne 
            const { id } = req.params
            await ProjectService.delete(
                id,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                message: "Project deleted successfully"
            })
        } catch (error) {
            next(error)
        }
    }


}