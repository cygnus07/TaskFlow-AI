import { getPriority } from "os"
import { Project } from "../models/project.model.js"
import { ITask, Task } from "../models/task.model.js"
import { User } from "../models/user.model.js"
import { AuthorizationError, NotFoundError, ValidationError } from "../utils/errors"


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
    status?: 'todo' | 'in-progress'  | 'review'  | 'done' | 'cancelled'
    actualHours?: number
}

export class TaskService {
    static async create(
        data: createTaskData,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        // find the project by projectId and tenantId
        // check if the project exists and verify user is a project member

        // validate the parent task
        // if parentTaskId is given, verify paretn task exists
        // and parent belongs to same project

        // check if the assignees exist in user collection
        // verify all assignees are project members

        // create task with provided data and tenantId
        // add initial activity log entyr

        // increment project.metadata.totalTasks
        // update project.metadata.lastActivityAt

        // return the task
        const project = await Project.findOne({ _id:data.projectId, tenantId })
        if(!project){
            throw new NotFoundError("Project does not exist")
        }
        if(!project.isMember(userId)){
            throw new AuthorizationError('You are not a member of this project')
        }

        if(data.parentTaskId){
            const parentTask = await Task.findOne({_id: data.parentTaskId,
                projectId: data.projectId,
                tenantId
            })
            if(!parentTask){
                throw new NotFoundError('Parent task does not exist')
            }
        }

        if(data.assignees && data.assignees.length > 0){
            const validAssignees = await User.find({
                _id: { $in: data.assignees},
                tenantId
            })

            const validIds = validAssignees.map(u => u._id.toString())
            const invalidAssignees = data.assignees.filter(id => !validIds.includes(id))

            if(invalidAssignees.length > 0){
                throw new ValidationError('Some assigness are not valid users')
            }

            for(const assigneeId of data.assignees){
                if(!project.isMember(assigneeId)){
                    throw new ValidationError('All assignees must be project members')
                }
            }
            
        }

        const task = await Task.create({
            ...data,
            tenantId,
            activityLog: [{
                user: userId,
                action: 'created',
                timeStamp: new Date(),
            }]
        })


        project.metadata.totalTasks += 1
        project.metadata.lastActivityAt = new Date()
        await project.save()

        return task



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
        // verify project access
            // find project using projectId and tenantId
            // check if the user is a project member
            // if not throw auth error
        
        // BUild query filters
            // start with base query and add status filter if given
            // add assignee, parentTaskId and search filters if given

        // Execute query with population
            // find tasks with built query
            // populate assignees 
            // populate parentTaskId
            // sort by priority, dueDate, createdAt

        // return tasks array
        const project = await Project.findOne({ 
            _id: projectId,
             tenantId})
        if(!project || !project.isMember(userId)){
            throw new AuthorizationError('Access denied to this project')
        }

        const query: any = { projectId, tenantId}
        if(filters?.status) query.status = filters.status
        if(filters?.assignee) query.assignees = filters.assignee
        if(filters?.parentTaskId) query.parentTaskId = filters?.parentTaskId
        if(filters?.search){
            query.$or = [
                { title: { $regex: filters.search, $options: 'i'} },
                { description: { $regex: filters.search, $options: 'i'}} 
            ]
        }

        const tasks = await Task.find(query)
        .populate('assignees', 'name email')
        .populate('parentTaskId', 'title')
        .sort({ priority: -1, dueDate: 1, createdAt: -1})

        return tasks
    }

    static async findById(
        taskId: string,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        // FInd task by taskId and tenantId
        // populate assigness (name, email)
        // populate parentTaskID (title)
        // populate dependencies.taskId (title, status)
        // populate commenst.user (name)
        // populate activityLog.user (name)

        // check if task exists

        // verify project access
        // check if the user exists in project members

        const task = await Task.findOne({
            _id: taskId,
            tenantId
        })
        .populate('assignees', 'name email')
        .populate('parentTaskId', 'title')
        .populate('dependencies.taskId', 'title status')
        .populate('comments.user', 'name')
        .populate('activityLog.user', 'name')

        if(!task){
            throw new NotFoundError('Task not found')
        }

        const project = await Project.findOne({
            _id: task.projectId,
            tenantId
         })

         if(!project || !project.isMember(userId)){
            throw new AuthorizationError('Acees denied for this task')
         }

         return task
    }


}