import { Types } from "mongoose"
import { Project } from "../models/project.model.js"
import { ITask, Task } from "../models/task.model.js"
import { User } from "../models/user.model.js"
import { AuthorizationError, NotFoundError, ValidationError } from "../utils/errors.js"


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

    static async update(
        taskId: string,
        data: UpdateTaskData,
        userId: string,
        tenantId: string
    ): Promise<ITask> {
        // find the task by taskId and tenantId
        // verify it and if not throw NotFoundError

        // find the project that has the task
        // check if is user is a project member or not
        // throw auth error if not

        // compare current task values with new data
        // buiild the changes object

        // apply all changes from data to task
        // add acitivity log entry 
        // save teh task

        // update project stats
        // return updated task and populate assignees and paretnTaskId

        const task = await Task.findOne({ 
            _id: taskId,
            tenantId
        })
        if(!task){
            throw new NotFoundError('Task not found')
        }

        const project = await Project.findOne({
            _id: task.projectId,
            tenantId
        })
        if(!project || !project.isMember(userId)){
            throw new AuthorizationError('Access denied for this task')
        }

        const changes: any = {}
        Object.keys(data).forEach(key => {
            if((task as any)[key] !== (data as any)[key]){
                changes[key] = { from: (task as any) [key], to: (task as any) [key]}
            }
        })

        Object.assign(task,data)

        if(Object.keys(changes).length >0 ){
            task.activityLog.push({
                user: new Types.ObjectId(userId),
                action: 'updated',
                details: changes,
                timestamp: new Date()
            })
        }

        await task.save()

        if(changes.status){
            await this.updateProjectTaskCounts(task.projectId.toString(), tenantId)
        }

        return task.populate(['assignees', 'parentTaskId'])



    }

    static async delete(
        taskId: string,
        userId: string,
        tenantId: string
    ): Promise<void> {
        // find the task by taskId and tenantId
        // check if task exists or not

        // find the project using task
        // check if it exists and the user is a member and a manager
        // if not throw auth error

        // check for subtasks
        // count documents where parentTaskId equals this taskId
        // throw validation error if subtasks exists

        // cleanup dependecides
        // remove this task from other tasks dependecies arrays
        // update all task taht have this tas as a dependecy

        //  delete the task

        // update project stats

        const task = await Task.findOne({ 
            _id: taskId,
            tenantId
        })
        if(!task){
            throw new NotFoundError(('Tsk not found'))
        }

        const project = await Project.findOne({
            _id: task.projectId,
            tenantId
        })

        if(!project){
            throw new NotFoundError('Project not found')
        }
        const userRole = project.getMemberRole(userId)
        if(userRole !== 'manager'){
            throw new AuthorizationError('Only manager can delete the task')
        }

        const subtaskCount = await Task.countDocuments({
            parentTaskId: taskId,
            tenantId
        })

        if(subtaskCount >0){
            throw new ValidationError('Cannot delete tasks with subtasks')
        }

        await Task.updateMany(
            { 'dependencies.taskId': taskId},
            { $pull: { dependecies: {taskId}}}
        )

        await task.deleteOne()

        await this.updateProjectTaskCounts(task.projectId.toString(), tenantId)




    }

   static async addDependency(
    taskId: string,
    dependencyTaskId: string,
    type: 'blocks' | 'blocked-by',
    userId: string,
    tenantId: string
   ): Promise<ITask> {
        // validate self dependency
        // check if both the taskId and dependency TaskId are equal
        // if not throw validation error

        // find both tasks using promise.all
        //  throw now founderror if not found

        // validate if they both belong to same project
        // if not throw validation error

        // check for circular dependencies
        // user helper mehtod wouldCreateCircularDependency
        // throw validation eror if circular dependency is created

        // add dependency if does not exists
        // add activity llog entry and save the task

        // return the task with dependencies.taskId

        if(taskId === dependencyTaskId){
            throw new ValidationError('Task cannot be same as dependecy task')
        }

        const [task, dependencyTask] = await Promise.all([
            Task.findOne({ _id: taskId, tenantId}),
            Task.findOne({ _id: dependencyTaskId, tenantId})
        ])

        if(!task || !dependencyTask){
            throw new NotFoundError('Tasks not found')
        }

        if(task.projectId.toString() !== dependencyTask.projectId.toString()){
            throw new ValidationError('Task and dependency do nto belong to same project')
        }

        if(await this.wouldCreateCircularDependency(taskId, dependencyTaskId, tenantId)){
            throw new ValidationError('Task cannot be assinged as dependency to itself')
        }

        const exists = task.dependecies.some(
            d => d.taskId.toString() === dependencyTaskId && d.type === type
        )

        if(!exists){
            task.dependecies.push({ taskId: new Types.ObjectId(dependencyTaskId), type})

            task.activityLog.push({
                user: new Types.ObjectId(userId),
                action: 'dependency_added',
                details: { dependencyTaskId, type},
                timestamp: new Date()
            })

            await task.save()
        }

        return task.populate('dependencies.taskId')


   }

   static async removeDependency(
    taskId: string,
    dependencyTaskId: string,
    userId: string,
    tenantId: string
   ): Promise<ITask> {

    // find and verify task
    // remove dependency from array
        // filter out the dependency from task.dependencies array
        // match by dependencyTaskId
    
    // add activity log
        // with dependency_removed, details and user and timestamp

    // save and return the updated task and 
    // populate dependencies.taskId

    const task = await Task.findOne({_id: taskId, tenantId})
    if(!task){
        throw new NotFoundError('Task not found')
    }

    task.dependecies = task.dependecies.filter(
        d => d.taskId.toString() !== dependencyTaskId
    )

    task.activityLog.push({
        user: new Types.ObjectId(userId),
        action: 'dependency_removed',
        details: { dependencyTaskId },
        timestamp: new Date()
    })

    await task.save()
    return task.populate('dependencies.taskId')





   }

   static async addComment(
        taskId: string,
        text: string,
        userId: string,
        tenantId: string,
   ): Promise<ITask> {
        // find and verify task
        // add comment to array task.comments
        // add acitivity log
        // save and return the updated task
        // populate comments.user (name)

        const task = await Task.findOne({_id: taskId, tenantId})
        if(!task){
            throw new NotFoundError('task not found')
        }

        task.comments.push({
            user: new Types.ObjectId(userId),
            text,
            createdAt: new Date()
        })

        task.activityLog.push({
            user: new Types.ObjectId(userId),
            action: 'commented_added',
            timestamp: new Date()
        })

        await task.save()
        return task.populate('comments.user')
   }



    private static async updateProjectTaskCounts(
        projectId: string,
        tenantId: string
    ): Promise<void> {
        // count different task categores
            // count total tasks for this project
            // count completed tasks for this
            // count overdue tasks (not done + dueDAte < currentDaate)
            // user Promise.all() to run all counts simultaneously

        // update project metadata
            // update project document with new counts
        
        const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
            Task.countDocuments({ projectId, tenantId}),
            Task.countDocuments({ projectId, tenantId, status: 'done'}),
            Task.countDocuments({
                projectId,
                tenantId,
                status: { $ne: 'done'},
                dueDate: { $lt: new Date()}
            })
        ])

        await Project.updateOne(
            {_id: projectId},
            {
                'metadata.totalTasks': totalTasks,
                'metadata.completedTasks': completedTasks,
                'metadata.overdueTasks': overdueTasks,
                'metadata.lastActivityAt': new Date()
            }
        )

    }

    private static async wouldCreateCircularDependency(
        taskId: string,
        dependencyTaskId: string,
        tenantId: string
    ): Promise<boolean> {
        const dependencyTask = await Task.findOne({
            _id: dependencyTaskId,
            tenantId
        })

        if(!dependencyTask) return false

        return dependencyTask.dependecies.some(
            d => d.taskId.toString() === taskId
        )
    }


}