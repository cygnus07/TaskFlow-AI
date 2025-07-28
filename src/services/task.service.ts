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
}