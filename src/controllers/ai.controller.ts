import { Response,NextFunction } from "express";
import { AuthRequest } from "../types";
import { ProjectService } from "../services/project.service";
import { AuthorizationError, ValidationError } from "../utils/errors";
import { TaskService } from "../services/task.service";
import { AIService } from "../services/ai.service";
import { Task } from "../models/task.model";


export class AIController {
    static async prioritizeTasks(req: AuthRequest, res: Response, next: NextFunction){
        try {
            // extract projectId from url params
            // get the project and verify user has access
            // check if the user is a project manager
            // only managers can use ai prioritization features
            
            // get all tasks for the project
            // validate there are tasks to prioritize

            // call aiservice.prioritizeTasks with tasks and project
            // update each task with ai metadata
            // store the ai suggestions
            // return the response

            const { projectId } = req.params
            const project = await ProjectService.findById(
                projectId,
                req.tenantId!,
                req.user!._id.toString()
            )
            const userRole = project.getMemberRole(req.user!._id.toString())
            if(userRole !== 'manager'){
                throw new AuthorizationError('Only Project managers can use ai prioritization')
            }

            const tasks = await TaskService.findByProject(
                projectId,
                req.user!._id.toString(),
                req.tenantId!
            )

            if(tasks.length === 0){
                throw new ValidationError('No tasks to prioritize')
            }

            const prioritizations = await AIService.prioritizeTasks(tasks, project)

            const updatedTasks = await Promise.all(
                prioritizations.map(async (p) => {
                    const task = await Task.findOneAndUpdate(
                        {_id: p.taskId, tenantId: req.tenantId},
                        {
                            $set: {
                                'aiMetaData.suggestedPriority': p.suggestPriority,
                                'aiMetaData.priorityScore': p.priorityScore,
                                'aiMetaData.complexityScore': p.estimatedComplexity,
                                'aiMetaData.suggestedDueDate': p.suggestedDueDate,
                                'aiMetaData.lastAnalyzedAt': new Date()
                            },
                            $push: {
                                activityLog: {
                                    user: req.user!._id,
                                    action: 'ai_prioritization',
                                    details: {
                                        oldPriority: tasks.find(t => String(t._id) === p.taskId)?.priority,
                                        suggestedPriority: p.suggestPriority,
                                        reasoning: p.reasoning,
                                    },
                                    timeStamp: new Date(),
                                }
                            }
                        },
                        {new: true}
                    )
                    return { task, reasoning: p.reasoning}
                })
            )

            res.json({
                success: true,
                data: {
                    prioritizations: updatedTasks,
                    summary: {
                        tasksAnalyzed: tasks.length,
                        highPriorityTasks: prioritizations.filter(p => p.suggestPriority === 'urgent' || p.suggestPriority === 'high').length
                    }
                },
                message: 'Tasks prioritized successfully with AI'
            })
            
        } catch (error) {
            next(error)
        }

    }
}