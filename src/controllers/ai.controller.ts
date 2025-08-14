import { Response,NextFunction } from "express";
import { AuthRequest } from "../types";
import { ProjectService } from "../services/project.service";
import { AuthorizationError, ValidationError } from "../utils/errors";
import { TaskService } from "../services/task.service";
import { AIService } from "../services/ai.service";
import { Task } from "../models/task.model";
import { User } from "../models/user.model";


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

    static async generateSchedule(req: AuthRequest, res: Response, next: NextFunction){
        // get the project id from url
        // get applySchedule flag from body
        // get the project and verify user has access
        // get tasks that need scheduling
        // filter for todo and inprogress

        // validate the tasks
        // get project members and members ids
        // call generateSchedule function 

        // if applyschedule is true, check the user is manager
        // update each task with start date and assignees
        // add activity log entries

        // return response

        try {
            const { projectId } = req.params
            const { applySchedule = false} = req.body // false by defaullt
            
            const project = await ProjectService.findById(
                projectId,
                req.tenantId!,
                req.user!._id.toString()
            )

            const tasks = await Task.find({
                projectId,
                tenantId: req.tenantId,
                status: { $in: ['todo', 'in-progress']}
            })

            if(tasks.length === 0){
                throw new ValidationError('No tasks available for scheduling')
            }

            const memberIds = project.members.map(m => m.user)
            const teamMembers = await User.find({
                _id: { $in: memberIds },
                tenantId: req.tenantId
            })

            const scheduleRecommendations = await AIService.generateSchedule(
                tasks,
                project,
                teamMembers
            )

            let appliedCount = 0
            if(applySchedule){
                const userRole = project.getMemberRole(req.user!._id.toString())
                if(userRole !== 'manager'){
                    throw new AuthorizationError('Only project managers can apply AI schedules')
                }

                for(const rec of scheduleRecommendations){
                    const task = tasks.find( t => String(t._id) === rec.taskId)
                    if(task){
                        await Task.findByIdAndUpdate(
                            rec.taskId,
                            {
                                $set: {
                                    startDate: rec.recommendedStartDate,
                                    assignees: rec.recommendedAssignees,
                                },
                                $push: {
                                    activityLog: {
                                        user: req.user!._id,
                                        action: 'ai_scheduled',
                                        details: {
                                            assignees: rec.recommendedAssignees,
                                            startDate: rec.recommendedStartDate,
                                            reasoning: rec.reasoning
                                        },
                                        timestamp: new Date()
                                    }
                                }
                            }
                        )
                        appliedCount++;
                    }
                }
            }


            res.json({
                success: true,
                data: {
                    schedule: scheduleRecommendations,
                    applied: applySchedule,
                    appliedCount,
                    summary: {
                        tasksScheduled: scheduleRecommendations.length,
                        averageWorkloadBalance: Math.round(
                            scheduleRecommendations.reduce((sum,r) => sum + r.worloadBalance, 0)
                        )
                    }
                },
                message: applySchedule? 'Schedule generated and applied' : 'Schedule generated successfully'

            })
        } catch (error) {
            next(error)
        }
    }

    static async suggestNextTasks(req: AuthRequest, res: Response, next: NextFunction){
        // extract taskId from url
        // get the completed task 
        
        // validate that task is completed
        // task status should be 'done, throw error if not
        // get the project that contains this task

        // get all tasks in the project for context
        // and call aiservice.findbyproject

        // call suggestNextTasks with task, project info
        // return the response

        try {
            const { taskId } = req.params
            const completedTask = await TaskService.findById(
                taskId,
                req.user!._id.toString(),
                req.tenantId!,
            )
            if(completedTask.status !== 'done'){
                throw new ValidationError('Task is not completed yet')
            }
            const project = await ProjectService.findById(
                completedTask.projectId.toString(),
                req.tenantId!,
                req.user!._id.toString()
                
            )

            const projectTasks = await TaskService.findByProject(
                completedTask.projectId.toString(),
                req.user!._id.toString(),
                req.tenantId!
            )

            const suggestions = await AIService.suggestNextTasks(
                completedTask,
                projectTasks,
                project
            )

            res.json({
                success: true,
                data: {
                    suggestions: suggestions.suggestedTasks,
                    basedOn: {
                        taskId: completedTask._id,
                        taskTitle: completedTask.title,
                    }
                },
                message: 'Next task suggestions generated'
            })

        } catch (error) {
            next(error)
        }
    }
}