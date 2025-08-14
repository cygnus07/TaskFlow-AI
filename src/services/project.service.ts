import { IProjectDocument, IProject, Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "../utils/errors.js";


interface createProjectData {
    name: string,
    description?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    startDate?: Date
    endDate?: Date
}

interface UpdateProjectData extends Partial<createProjectData> {
    status?: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
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
            priority?: string
            search?: string
        }
    ) : Promise<IProjectDocument[]> {

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
    ) : Promise<IProjectDocument> {
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

    static async update(
        projectId: string,
        data: UpdateProjectData,
        userId: string,
        tenantId: string
    ) : Promise<IProject> {
        // find project by _id and tenantId
        // if not found throw Notfound Error
        // get user role using project.getMemberRole(userId)
        // check if user has permission to update
        // if user is not a manager throw AuthorizationError
        // update project fields with new data
        // update lastActivityAt to current date
        // save the project

        // populate owner and members.user fields
        // return the updated project

        const project = await Project.findOne({ _id: projectId, tenantId})
        if(!project){
            throw new NotFoundError('Project not found')
        }
        const userRole = project.getMemberRole(userId)
        if(!userRole || userRole !== 'manager'){
            throw new AuthorizationError('Only project managers can update projects')
        }

        Object.assign(project,data);
        project.metadata.lastActivityAt = new Date()

        await project.save()

        return project.populate(['owner', 'members.user'])

    }

    static async delete (
        projectId: string,
        userId: string,
        tenantId: string
    ): Promise<void> {
        // find project by _id and tenantId
        // if not found throw NotFoundError
        // check if user is the project owner
        // compare project.owner with userId
        // if not owner throw AuthorizationError
        // delete the project using deleteOne()
        

        const project = await Project.findOne({ _id: projectId, tenantId})
        if(!project){
            throw new NotFoundError('Project not found')
        }
        if(project.owner.toString() !== userId){
            throw new AuthorizationError('Only project owner can delete the project')
        }

        await project.deleteOne()
    }

    static async addMember(
        projectId: string,
        memberEmail: string,
        role: 'manager' | 'member',
        userId: string,
        tenantId: string
    ) : Promise<IProject> {
        // find project by _id and tenantId
        // if not found throw NotFoundError

        // check if user has permission to add members
        // get user role using project.getMemberRole(userId)
        // if user is a member and project doesn't allow member invites throw AuthorizationError
        
        // find user to add by email and tenantId
        // if user not found throw NotFoundError

        // check if user is already a member
        // use project.isMemeber(userToAdd._id) tp check
        // if already a member throw ConflictError

        // add new member to project.members array
        // update lastActivityAt to current date
        // save the project

        // populate owner and members.user fields
        // return the updated project

        const project = await Project.findOne({_id: projectId, tenantId})
        if(!project){
            throw new NotFoundError('Project not found')
        }

        const userRole = project.getMemberRole(userId)
        if(!userRole || (userRole === 'member' && !project.settings.allowedMemberInvite)){
            throw new AuthorizationError('You cannot add members to this project')
        }

        const userToAdd = await User.findOne({email: memberEmail, tenantId})
        if(!userToAdd){
            throw new NotFoundError('User not found')
        }

        if(project.isMember(userToAdd._id.toString())){
            throw new ConflictError('User is already a project member')
        }

        project.members.push({
            user: userToAdd._id,
            role,
            joinedAt: new Date()
        })

        project.metadata.lastActivityAt = new Date()
        await project.save()

        return project.populate(['owner', 'members.user'])


    }

    static async removeMember(
        projectId: string,
        memberId: string,
        userId: string,
        tenantId: string
    ): Promise<IProject> {
        // find project by _id and tenantId
        // if user not found throw NotFoundError

        const project = await Project.findOne({ _id: projectId, tenantId})
        if(!project){
            throw new NotFoundError('Project not found')
        }

        // check if user has permission to remove members
        // get user role using project.getMemberRole(userId)
        // if user is not a manager throw AuthorizationError

        const userRole = project.getMemberRole(userId)
        if(!userRole || userRole !== 'manager'){
            throw new AuthorizationError('Only managers can remove members')
        }

        // check if trying to remove project owner
        // compare project.owner with memberId
        // if tryin gto remove owner throw ValidationError

        if(project.owner.toString() === memberId){
            throw new ValidationError('Cannot remove project owner')
        }

        // remove member from project.members array
        // filter out the member with matching user id
        // update lastActivityAt to current date
        // save the project

        project.members = project.members.filter(
            m => m.user.toString() !== memberId
        )
        project.metadata.lastActivityAt = new Date()
        await project.save()

        // populate owner and members.user fields
        // return the updated project

        return project.populate(['owner', 'members.user'])
    }
}