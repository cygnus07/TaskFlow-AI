import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/index.js";
import { ValidationError } from "../utils/errors.js";
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
}