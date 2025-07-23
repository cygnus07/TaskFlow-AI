import { IProject, Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { AuthorizationError, NotFoundError } from "../utils/errors";


interface createProjectData {
    name: string,
    description?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    startDate?: Date
    endDate?: Date
}

export class ProjectService {
    static async create(
        data: createProjectData,
        userId: string,
        tenantId: string
    ): Promise<IProject> {
        // find the user by userId and tenantId
        // if user doesnt exists throw Notfounderror

        // create a new project document
            // set owner to userId and set tenant
        
        // save the project and return the created project

        const user = await User.findOne({ _id: userId, tenantId})
        if(!user){
            throw new NotFoundError('User not found')
        }

        const project = await Project.create({
            ...data,
            owner: userId,
            tenantId,
            members: [{
                user: userId,
                role: 'manager',
                joinedAt: new Date(),
            }]
        })

        return project
    }

    static async findAll(
        tenantId: string,
        userId: string,
        filters?: {
            status?: string
            priority: string
            search?: string
        }
    ) : Promise<IProject[]> {

        // start query with { tenantId }
        // add $or condition so user only sees projects where 
        // either user is the owner or user is in members.user

        // apply filters
        // query project.find with the queries
        // return the list of projects

        const query: any = { tenantId }

        query.$or = [
            { owner: userId },
            { 'members.user': userId},
        ]

        if(filters?.status){
            query.status = filters.status
        }
        if(filters?.priority){
            query.priority = filters.priority
        }
        if(filters?.search){
            query.name = { $regex: filters.search, $options: 'i'}
        }

        const projects = await Project.find(query)
        .populate('owner', 'name email')
        .populate('members.user', 'name email')
        .sort({ createdAt: -1})

        return projects
    }

    static async findById(
        projectId: string,
        tenantId: string,
        userId: string
    ) : Promise<IProject> {
        // find project by _id and tenantId
        // populate owner and members.user
        // if not found throw Notfounderror
        // check if the user is a member of the project
        // by using project.isMember(userId)
        // if not throw authorization error
        // return the project

        const project = await Project.findOne({_id: projectId, tenantId})
        .populate('owner', 'name email')
        .populate('members.user', 'name email')

        if(!project){
            throw new NotFoundError('Project not found')
        }

        if(!project.isMember(userId)){
            throw new AuthorizationError('You do not have access to this project')
        }

        return project
    }
}