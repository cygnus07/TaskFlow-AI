import {  Response, NextFunction } from "express";
import { AuthRequest } from "../types/index.js";
import { ValidationError } from "../utils/errors.js";
import { TaskService } from "../services/task.service.js";



export class TaskController {
    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // get the projectId from url params
            
            // get the task data from req.body
            // validate the required fields

            // call TaskService.create()
            // return success response with 201 code
            // send the task data 

            const { projectId } = req.params
            const {
                parentTaskId,
                title,
                description,
                priority,
                dueDate,
                startDate,
                estimatedHours,
                assignees,
                tags
            } = req.body

            if(!title){
                throw new ValidationError('Title is required')
            }

            const task = TaskService.create({
                projectId,
                parentTaskId,
                title,
                description,
                priority,
                dueDate,
                startDate,
                estimatedHours,
                assignees,
                tags
            },
            req.user!._id.toString(),
            req.tenantId!
        )

        res.status(201).json({
            success: true,
            data: { task },
            message: 'Task created successfully'
        })
        } catch (error) {
            next(error)
        }
    }

    static async findByProject(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the projectId from url params

            // get the filter options from query params
            // status, assignee, parentTaskId, search

            // call TaskService.findByProject()  with
            // projectId, userId, tenanatId

            // return success response with
            // tasks array and count of tasks

            const { projectId } = req.params
            const { status, assignee, parentTaskId, search} = req.query

            const tasks = await TaskService.findByProject(
                projectId,
                req.user!._id.toString(),
                req.tenantId!,
                {
                    status: status as string,
                    assignee: assignee as string,
                    parentTaskId: parentTaskId as string,
                    search: search as string,
                }
            )

            res.json({
                success: true,
                data: {
                    tasks,
                    count: tasks.length
                },

            })

        } catch (error) {
            next(error)
        }
    }

    static async findById(req: AuthRequest, res: Response, next: NextFunction){
        // get the taskId from url params
        // call TaskService.findById() with
        // taskId, userId and tenantId
        // send the success response with task data

        try {
            const { taskId } = req.params
            const task = TaskService.findById(
                taskId,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                data: { task }
            })
        } catch (error) {
            next(error)
        }
    }

    static async update(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the taskId form req.params
            // get all update data from req body

            // call TaskService.update with
            // taskId, updates object, userId and tenantId

            // send the response with updated task data

            const { taskId } = req.params
            const updates = req.body // could be any combination of task fields

            const updatedTask  = TaskService.update(
                taskId,
                updates,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                data: { updatedTask},
                message: "task updated successfully"
            })
        } catch (error) {
            next(error)
        }
    }

    static async delete(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the task id 
            // call TaskService.delete with 
            // taskid, userId, and tenantId
            // send the success respons with message
            const { id } = req.params
            TaskService.delete(
                id,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                message: 'Task deleted succesfully'
            })
        } catch (error) {
            next(error)
        }
    }

    static async updateStatus(req: AuthRequest, res: Response, next: NextFunction){
        // get the task id 
        // get the status from req body
        // validate the status if not validation error
        //call TaskService.update() with
        // taskId, only status field, userId, and tenantId
        // send the response with updated task data

       try {
         const { id } = req.params
         const { status } = req.body
         if(!status){
             throw new ValidationError('Status is required')
         }
         const task = TaskService.update(
             id,
             { status },
             req.user!._id.toString(),
             req.tenantId!
         )
 
         res.json({
             success: true,
             message: 'Task status updated successfully'
         })
       } catch (error) {
            next(error)
       }
    }

    static async addDependency(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the task id
            // get dependencyTaskId and type from body
            // type is 'blocks' by default
            // validate dependencyTaskId and if not val error
            // call TaskService.addDependency with
            // taskId, dependencyTaskId, type and user and tenant id
            const { id } = req.params
            const { dependencyTaskId, type = 'blocks' } = req.body
            if(!dependencyTaskId){
                throw new ValidationError('Dependency task id is required')
            }
            
            const task = TaskService.addDependency(
                id,
                dependencyTaskId,
                type,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                data: { task },
                message: 'Dependency added successfully'

            })
        } catch (error) {
            next(error)
        }
    }

    static async removeDependency(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the taskId and dependencyId form req.params
            // call TaskService.removeDependency 
            // send response with udpated task data

            const { id, dependencyId} = req.params
            const task = TaskService.removeDependency(
                id,
                dependencyId,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                data: {task },
                message: 'Dependency removed successfully'
            })
        } catch (error) {
            next(error)
        }
    }

    static async addComment(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the task id
            // get the comment frm req body
            // validate that text is provided
            // call TaskService.addComment
            // send response with updated task

            const { id } =req.params
            const { comment } =req.body

            if(!comment){
                throw new ValidationError('Comment is required')
            }

            const task = TaskService.addComment(
                id,
                comment,
                req.user!._id.toString(),
                req.tenantId!
            )

            res.json({
                success: true,
                data: {task},
                message: "comment added successfully"
            })
        } catch (error) {
            next(error)
        }
    }

    static async getSubtasks(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // get the task id 
            // verify that parent task exists and user has access
            // using TaskService.findByid 

            // get subtasks by calling findByProject with
            // projectId, userId, tenantId

            // send the success response
            const { id }= req.params
            await TaskService.findById(
                id,
                req.user!._id.toString(),
                req.tenantId!
            )

            const subtasks = await TaskService.findByProject(
                req.params.projectId || '',
                req.user!._id.toString(),
                req.tenantId!,
                { parentTaskId: id}
            )

            res.json({
                success: true,
                data: {
                    subtasks,
                    count: subtasks.length
                }
            })
        } catch (error) {
            next(error)
        }
    }
}