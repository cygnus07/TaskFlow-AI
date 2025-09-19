import { Types } from "mongoose"
import { Project } from "../models/project.model.js"
import { ITask, Task } from "../models/task.model.js"
import { User } from "../models/user.model.js"
import { AuthorizationError, NotFoundError, ValidationError } from "../utils/errors.js"
import { SocketService } from "./socket.service.js"
import { NotificationService } from "./notification.service.js"

export interface createTaskData {
    projectId: string
    parentTaskId?: string
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: Date
    startDate?: Date
    estimatedHours?: number
    assignees?: string[]
    tags?: string[]
}

interface UpdateTaskData extends Partial<createTaskData> {
    status?: 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled'
    actualHours?: number
}

export class TaskService {
    static async create(
        data: createTaskData,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        try {
            // Find the project by projectId and tenantId
            const project = await Project.findOne({ 
                _id: new Types.ObjectId(data.projectId), 
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!project) {
                throw new NotFoundError("Project does not exist")
            }
            
            if (!project.isMember(userId)) {
                throw new AuthorizationError('You are not a member of this project')
            }

            // Validate parent task if provided
            if (data.parentTaskId) {
                const parentTask = await Task.findOne({
                    _id: new Types.ObjectId(data.parentTaskId),
                    projectId: new Types.ObjectId(data.projectId),
                    tenantId: new Types.ObjectId(tenantId)
                })
                if (!parentTask) {
                    throw new NotFoundError('Parent task does not exist')
                }
            }

            // Validate assignees
            if (data.assignees && data.assignees.length > 0) {
                const filteredAssignees = data.assignees.filter(id => id && id.trim() !== "")
                if (filteredAssignees.length === 0) {
                    data.assignees = []
                } else {
                    // Convert string IDs to ObjectIds for validation
                    const assigneeObjectIds = filteredAssignees.map(id => new Types.ObjectId(id))
                    
                    const validAssignees = await User.find({
                        _id: { $in: assigneeObjectIds },
                        tenantId: new Types.ObjectId(tenantId)
                    })

                    if (validAssignees.length !== filteredAssignees.length) {
                        throw new ValidationError("Some assignees are not valid users")
                    }

                    // Check if all assignees are project members
                    for (const assigneeId of filteredAssignees) {
                        if (!project.isMember(assigneeId)) {
                            throw new ValidationError("All assignees must be project members")
                        }
                    }
                    data.assignees = filteredAssignees
                }
            }

            // Prepare task data with proper ObjectId conversions
            const taskData: any = {
                title: data.title,
                description: data.description,
                priority: data.priority || 'medium',
                dueDate: data.dueDate,
                startDate: data.startDate,
                estimatedHours: data.estimatedHours,
                tags: data.tags || [],
                projectId: new Types.ObjectId(data.projectId),
                tenantId: new Types.ObjectId(tenantId),
                assignees: data.assignees ? data.assignees.map(id => new Types.ObjectId(id)) : [],
                activityLog: [{
                    user: new Types.ObjectId(userId),
                    action: 'created',
                    timestamp: new Date(),
                }]
            }

            if (data.parentTaskId) {
                taskData.parentTaskId = new Types.ObjectId(data.parentTaskId)
            }

            const task = await Task.create(taskData)

            // Notify via socket (wrap in try-catch to prevent failures)
            try {
                SocketService.notifyTaskCreated(task, data.projectId)
            } catch (error) {
                console.warn('Socket notification failed:', error)
            }

            // Send notifications to assignees
            if (data.assignees && data.assignees.length > 0) {
                try {
                    await NotificationService.notifyTaskAssignment(
                        task,
                        data.assignees,
                        userId,
                        tenantId
                    )
                } catch (error) {
                    console.warn('Notification service failed:', error)
                }
            }

            // Update project metadata
            project.metadata.totalTasks = (project.metadata.totalTasks || 0) + 1
            project.metadata.lastActivityAt = new Date()
            await project.save()

            return task

        } catch (error) {
            console.error('TaskService.create error:', error)
            throw error
        }
    }

    static async findByProject(
        projectId: string,
        userId: string,
        tenantId: string,
        filters?: {
            status?: string
            assignee?: string
            parentTaskId?: string | null
            search?: string
        }
    ): Promise<ITask[]> {
        try {
            const project = await Project.findOne({ 
                _id: new Types.ObjectId(projectId),
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!project || !project.isMember(userId)) {
                throw new AuthorizationError('Access denied to this project')
            }

            const query: any = { 
                projectId: new Types.ObjectId(projectId), 
                tenantId: new Types.ObjectId(tenantId)
            }
            
            if (filters?.status) query.status = filters.status
            if (filters?.assignee) query.assignees = new Types.ObjectId(filters.assignee)
            if (filters?.parentTaskId) query.parentTaskId = new Types.ObjectId(filters.parentTaskId)
            if (filters?.search) {
                query.$or = [
                    { title: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ]
            }

            const tasks = await Task.find(query)
                .populate('assignees', 'name email')
                .populate('parentTaskId', 'title')
                .sort({ priority: -1, dueDate: 1, createdAt: -1 })

            return tasks

        } catch (error) {
            console.error('TaskService.findByProject error:', error)
            throw error
        }
    }

    static async findById(
        taskId: string,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        try {
            const task = await Task.findOne({
                _id: new Types.ObjectId(taskId),
                tenantId: new Types.ObjectId(tenantId)
            })
                .populate('assignees', 'name email')
                .populate('parentTaskId', 'title')
                .populate('dependencies.taskId', 'title status')
                .populate('comments.user', 'name')
                .populate('activityLog.user', 'name')

            if (!task) {
                throw new NotFoundError('Task not found')
            }

            const project = await Project.findOne({
                _id: task.projectId,
                tenantId: new Types.ObjectId(tenantId)
            })

            if (!project || !project.isMember(userId)) {
                throw new AuthorizationError('Access denied for this task')
            }

            return task

        } catch (error) {
            console.error('TaskService.findById error:', error)
            throw error
        }
    }

    static async update(
        taskId: string,
        data: UpdateTaskData,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        try {
            const task = await Task.findOne({ 
                _id: new Types.ObjectId(taskId),
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!task) {
                throw new NotFoundError('Task not found')
            }

            const project = await Project.findOne({
                _id: task.projectId,
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!project || !project.isMember(userId)) {
                throw new AuthorizationError('Access denied for this task')
            }

            // Build changes object before modifying the task
            const changes: any = {}
            Object.keys(data).forEach(key => {
                const taskValue = (task as any)[key]
                const dataValue = (data as any)[key]
                
                if (Array.isArray(taskValue) && Array.isArray(dataValue)) {
                    if (JSON.stringify(taskValue.map(v => v.toString())) !== JSON.stringify(dataValue)) {
                        changes[key] = { from: taskValue, to: dataValue }
                    }
                } else if (taskValue?.toString() !== dataValue?.toString()) {
                    changes[key] = { from: taskValue, to: dataValue }
                }
            })

            // Update task properties
            if (data.title !== undefined) task.title = data.title
            if (data.description !== undefined) task.description = data.description
            if (data.status !== undefined) {
                task.status = data.status
                // Set completedAt when task is marked as done
                if (data.status === 'done' && !task.completedAt) {
                    task.completedAt = new Date()
                } else if (data.status !== 'done') {
                    task.completedAt = undefined
                }
            }
            if (data.priority !== undefined) task.priority = data.priority
            if (data.dueDate !== undefined) task.dueDate = data.dueDate
            if (data.startDate !== undefined) task.startDate = data.startDate
            if (data.estimatedHours !== undefined) task.estimatedHours = data.estimatedHours
            if (data.actualHours !== undefined) task.actualHours = data.actualHours
            if (data.assignees !== undefined) {
                task.assignees = data.assignees.map(id => new Types.ObjectId(id))
            }
            if (data.tags !== undefined) task.tags = data.tags
            if (data.parentTaskId !== undefined) {
                task.parentTaskId = data.parentTaskId ? new Types.ObjectId(data.parentTaskId) : undefined
            }

            // Add activity log if there are changes
            if (Object.keys(changes).length > 0) {
                task.activityLog.push({
                    user: new Types.ObjectId(userId),
                    action: 'updated',
                    details: changes,
                    timestamp: new Date()
                })
            }

            await task.save()

            // Notify via socket
            try {
                SocketService.notifyTaskUpdated(task, task.projectId.toString(), changes)
            } catch (error) {
                console.warn('Socket notification failed:', error)
            }

            // Send completion notification
            if (changes.status && data.status === 'done') {
                const memberIds = project.members.map(m => m.user.toString())
                try {
                    await NotificationService.notifyTaskCompleted(
                        task,
                        userId,
                        memberIds,
                        tenantId
                    )
                } catch (error) {
                    console.warn('Notification service failed:', error)
                }
            }

            // Update project task counts
            if (changes.status) {
                await this.updateProjectTaskCounts(task.projectId.toString(), tenantId)
            }

            // Return populated task
            const populatedTask = await Task.findById(task._id)
                .populate('assignees', 'name email')
                .populate('parentTaskId', 'title')

            return populatedTask!

        } catch (error) {
            console.error('TaskService.update error:', error)
            throw error
        }
    }

    static async delete(
        taskId: string,
        userId: string,
        tenantId: string
    ): Promise<void> {
        try {
            const task = await Task.findOne({ 
                _id: new Types.ObjectId(taskId),
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!task) {
                throw new NotFoundError('Task not found')
            }

            const project = await Project.findOne({
                _id: task.projectId,
                tenantId: new Types.ObjectId(tenantId)
            })

            if (!project) {
                throw new NotFoundError('Project not found')
            }
            
            const userRole = project.getMemberRole(userId)
            if (userRole !== 'manager') {
                throw new AuthorizationError('Only manager can delete the task')
            }

            const subtaskCount = await Task.countDocuments({
                parentTaskId: new Types.ObjectId(taskId),
                tenantId: new Types.ObjectId(tenantId)
            })

            if (subtaskCount > 0) {
                throw new ValidationError('Cannot delete tasks with subtasks')
            }

            // Remove dependencies
            await Task.updateMany(
                { 'dependencies.taskId': new Types.ObjectId(taskId) },
                { $pull: { dependencies: { taskId: new Types.ObjectId(taskId) } } }
            )

            await task.deleteOne()
            await this.updateProjectTaskCounts(task.projectId.toString(), tenantId)

        } catch (error) {
            console.error('TaskService.delete error:', error)
            throw error
        }
    }

    static async addDependency(
        taskId: string,
        dependencyTaskId: string,
        type: 'blocks' | 'blocked-by',
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        try {
            if (taskId === dependencyTaskId) {
                throw new ValidationError('Task cannot be same as dependency task')
            }

            const [task, dependencyTask] = await Promise.all([
                Task.findOne({ _id: new Types.ObjectId(taskId), tenantId: new Types.ObjectId(tenantId) }),
                Task.findOne({ _id: new Types.ObjectId(dependencyTaskId), tenantId: new Types.ObjectId(tenantId) })
            ])

            if (!task || !dependencyTask) {
                throw new NotFoundError('One or both tasks not found')
            }

            if (task.projectId.toString() !== dependencyTask.projectId.toString()) {
                throw new ValidationError('Tasks must belong to the same project')
            }

            if (await this.wouldCreateCircularDependency(taskId, dependencyTaskId, tenantId)) {
                throw new ValidationError('This would create a circular dependency')
            }

            const exists = task.dependencies.some(
                d => d.taskId.toString() === dependencyTaskId && d.type === type
            )

            if (!exists) {
                task.dependencies.push({ 
                    taskId: new Types.ObjectId(dependencyTaskId), 
                    type 
                })

                task.activityLog.push({
                    user: new Types.ObjectId(userId),
                    action: 'dependency_added',
                    details: { dependencyTaskId, type },
                    timestamp: new Date()
                })

                await task.save()
            }

            const populatedTask = await Task.findById(task._id)
                .populate('dependencies.taskId', 'title status')

            return populatedTask!

        } catch (error) {
            console.error('TaskService.addDependency error:', error)
            throw error
        }
    }

    static async removeDependency(
        taskId: string,
        dependencyTaskId: string,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        try {
            const task = await Task.findOne({
                _id: new Types.ObjectId(taskId), 
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!task) {
                throw new NotFoundError('Task not found')
            }

            task.dependencies = task.dependencies.filter(
                d => d.taskId.toString() !== dependencyTaskId
            )

            task.activityLog.push({
                user: new Types.ObjectId(userId),
                action: 'dependency_removed',
                details: { dependencyTaskId },
                timestamp: new Date()
            })

            await task.save()
            
            const populatedTask = await Task.findById(task._id)
                .populate('dependencies.taskId', 'title status')

            return populatedTask!

        } catch (error) {
            console.error('TaskService.removeDependency error:', error)
            throw error
        }
    }

    static async addComment(
        taskId: string,
        text: string,
        userId: string,
        tenantId: string,
    ): Promise<ITask> {
        try {
            const task = await Task.findOne({
                _id: new Types.ObjectId(taskId), 
                tenantId: new Types.ObjectId(tenantId)
            })
            
            if (!task) {
                throw new NotFoundError('Task not found')
            }

            task.comments.push({
                user: new Types.ObjectId(userId),
                text,
                createdAt: new Date()
            })

            task.activityLog.push({
                user: new Types.ObjectId(userId),
                action: 'comment_added',
                timestamp: new Date()
            })

            await task.save()
            
            const populatedTask = await Task.findById(task._id)
                .populate('comments.user', 'name')

            return populatedTask!

        } catch (error) {
            console.error('TaskService.addComment error:', error)
            throw error
        }
    }

    private static async updateProjectTaskCounts(
        projectId: string,
        tenantId: string
    ): Promise<void> {
        try {
            const projectObjectId = new Types.ObjectId(projectId)
            const tenantObjectId = new Types.ObjectId(tenantId)

            const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
                Task.countDocuments({ projectId: projectObjectId, tenantId: tenantObjectId }),
                Task.countDocuments({ projectId: projectObjectId, tenantId: tenantObjectId, status: 'done' }),
                Task.countDocuments({
                    projectId: projectObjectId,
                    tenantId: tenantObjectId,
                    status: { $ne: 'done' },
                    dueDate: { $lt: new Date() }
                })
            ])

            await Project.updateOne(
                { _id: projectObjectId },
                {
                    'metadata.totalTasks': totalTasks,
                    'metadata.completedTasks': completedTasks,
                    'metadata.overdueTasks': overdueTasks,
                    'metadata.lastActivityAt': new Date()
                }
            )

        } catch (error) {
            console.error('TaskService.updateProjectTaskCounts error:', error)
            throw error
        }
    }

    private static async wouldCreateCircularDependency(
        taskId: string,
        dependencyTaskId: string,
        tenantId: string
    ): Promise<boolean> {
        try {
            const dependencyTask = await Task.findOne({
                _id: new Types.ObjectId(dependencyTaskId),
                tenantId: new Types.ObjectId(tenantId)
            })

            if (!dependencyTask) return false

            return dependencyTask.dependencies.some(
                d => d.taskId.toString() === taskId
            )

        } catch (error) {
            console.error('TaskService.wouldCreateCircularDependency error:', error)
            return false
        }
    }
}