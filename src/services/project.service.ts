import { IProject, Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { NotFoundError } from "../utils/errors";


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
}