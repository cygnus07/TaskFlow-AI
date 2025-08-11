import { config } from '../config/index.js'
import OpenAI from 'openai'
import { AppError } from '../utils/errors.js'
import { ITask } from '../models/task.model.js'
import { IProject } from '../models/project.model.js'

interface TaskPrioritizationResult {
    taskId: string
    suggestPriority: 'low' | 'medium' | 'high' | 'urgent'
    priorityScore: number
    reasoning: string
    suggestedDueDate?: Date
    estimatedComplexity: number
}

interface SchedulingRecommendation {
    taskId: string
    recommendedStartDate: Date
    recommendedAssignees: string[]
    worloadBalance: number
    conflicts: string[]
    reasoning: string
}

export class AIService {
    private static openai: OpenAI | null = null
    private static getClient(): OpenAI {
        // check if AI features are enabled in config
        // check if we have the openai api key
        // if we don't have a client instance yet crate one
        // use the api key from config
        // store it in the static property for reuse
        // return the client instance

        if(!config.ai.enabled || !config.ai.openaiApiKey){
            throw new AppError('AI features are not enabled', 400)
        }
        if(!this.openai){
            this.openai = new OpenAI({
                apiKey: config.ai.openaiApiKey
            })
        }
        return this.openai
    }

    static async prioritizeTasks(
        tasks: ITask[],
        project: IProject
    ) : Promise<TaskPrioritizationResult[]>{
        // get the openai client
        // transform tasks into simpler format
        // extract just the fields ai needs like id, title, 
        // dont send full mongoose objects to ai

        // build the detailed prompt
        // give project context, task data, instructions and response fomat
        
        // call openai api with system message definng ai role
        // user message, json response format and temperature for consistency

        // parse the json response 
        // handle the cases where response might be nested differently
        // return the prioritization results

        const client = this.getClient()
        
        const taskData = tasks.map(task => ({
            id: String(task._id),
            title: task.title,
            description: task.description,
            currentPriority: task.priority,
            dueDate: task.dueDate,
            assignees: task.dependecies.length,
            subtasks: tasks.filter(t => t.parentTaskId?.toString() === String(task._id)).length,
            status: task.status,
            tags: task.tags,
            
        }))

        const prompt = `
            You are an expert project manager AI. Analyze the following tasks and provide integlligent prioritization.
            Project Context:
            - Name: ${project.name}
            - Description: ${project.description}
            - Status: ${project.status}
            - Team Size: ${project.members.length}

            Tasks to analyze:
            ${JSON.stringify(taskData,null, 2)}

            For each task, provide:
            1. Suggested priority (low/medium/high/urgent)
            2. Priority score(0-100, where 100 is most urgent)
            3. Brief reasoning for the prioritization
            4. Suggested due date if not set
            5. Estimated complexity (1-10 scale)

            Consider factors like:
            - Dependencies between tasks
            - Project deadlines
            - Resource availability
            - Task complexity
            - Business impact

            Respond with a JSON array of prioritization results.
            Format: [{ taskId, suggestedPriority, priorityScore, reasoning, suggestedDueDate, estimatedComplexity}]

            
        `

        try {
            const completion = await client.chat.completions.create({
                model: config.ai.model,
                messages: [
                   {
                     role: 'system',
                    content: 'You are a project management AI that provides task prioritization in JSON format',
                   },
                   {
                    role: 'user',
                    content: prompt,
                   },
                ],
                temperature: 0.7,
                response_format: {type: 'json_object'}
            })

            const response = completion.choices[0].message.content
            if(!response){
                throw new Error('No response from AI')
            }
            const result = JSON.parse(response)
            return result.prioritization || result
        } catch (error) {
            console.error('AI prioritization error: ', error)
            throw new AppError('Failed to prioritize tasks with AI', 500)
        }

        
    }

    static async generateSchedule(
        tasks: ITask[],
        project: IProject,
        taskMembers: any[]
    ): Promise<SchedulingRecommendation[]>{
        // get the openai client

        // prepare the task data for scheduling
        // build the scheduling prompt
        // call openai api 
        // parse response and handle different response structures
        // return scheduling recommendations

        const client = this.getClient()
        const taskData = tasks.map(task => ({
            id: String(task._id),
            title: task.title,
            estimatedHours: task.estimatedHours,
            priority: task.priority,
            dependencies: task.dependecies.map(d => d.taskId.toString),
            currentAssignees: task.assignees.map(a => a.toString()),
            status: task.status,
        }))

        const memberData = taskMembers.map(member => ({
            id: member._id.toString(),
            name: member.name,
            role: member.role,
            currentTasks: tasks.filter(t => 
                t.assignees.some(a => a.toString() === member._id.toString()) &&
                t.status !== 'done'
            ).length,
        }))


          const prompt = `
    As an AI scheduling expert, create an optimal schedule for the following tasks.
    
    Project: ${project.name}
    Current Date: ${new Date().toISOString()}
    
    Tasks:
    ${JSON.stringify(taskData, null, 2)}
    
    Team Members:
    ${JSON.stringify(memberData, null, 2)}
    
    For each task, recommend:
    1. Optimal start date
    2. Best team member(s) to assign
    3. Workload balance score (0-100, where 100 is perfectly balanced)
    4. Any scheduling conflicts
    5. Reasoning for the recommendation
     Consider:
    - Task dependencies (tasks can't start until dependencies are complete)
    - Team member workload balance
    - Task priority
    - Estimated effort
    - Skill matching based on roles
    
    Respond with JSON array of scheduling recommendations.
    `

        try {
            const completion = await client.chat.completions.create({
                model: config.ai.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a scheduling AI that provides optimal task scheduling in JSON format',

                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.6,
                response_format: { type: 'json_object'}
            })

            const response = completion.choices[0].message.content
            if(!response){
                throw new Error('No response from AI')
            }
            const result = JSON.parse(response)
            return result.schedules || result.recommendations || result
        } catch (error) {
            console.error('AI scheduling error: ', error)
            throw new AppError('Failed to generate schedule with AI', 500)
        }
    }

    static async suggestNextTasks(
        completedTask: ITask,
        projectTasks: ITask[],
        project: IProject
    ): Promise<{
    suggestedTasks: Array<{
      title: string;
      description: string;
      priority: string;
      estimatedHours: number;
      reasoning: string;
    }>;
  }> {
        // get the openai client

        // build the prompt
        // call openai api
        // parse the json response 
        // return the suggested tasks

        const client = this.getClient()

        const prompt = `
    Based on the completed task, suggest logical follow-up tasks.
    
    Completed Task:
    - Title: ${completedTask.title}
    - Description: ${completedTask.description}
    - Tags: ${completedTask.tags.join(', ')}
    
    Project Context:
    - Name: ${project.name}
    - Current Tasks: ${projectTasks.length}
    - Project Status: ${project.status}
    
    Existing Tasks (to avoid duplicates):
    ${projectTasks.map(t => t.title).join('\n')}
    
    Suggest 2-3 follow-up tasks that would logically come next.
    For each suggestion, provide:
    1. Task title
    2. Brief description
    3. Priority level
    4. Estimated hours
    5. Reasoning why this task makes sense
    
    Respond with JSON format.
    `;

    try {
        const completion = await client.chat.completions.create({
            model: config.ai.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a project management AI that suggests logical follow-up tasks',
                },
                {
                    role: 'user',
                    content: prompt,
                }
            ],
            temperature: 0.8,
            response_format: { type: 'json_object'}
        })

        const response = completion.choices[0].message.content
        if(!response){
            throw new Error('No response from AI')
        }
        return JSON.parse(response)
    } catch (error) {
        console.error('AI suggestion error:', error)
        throw new AppError('Failed to generate task suggestions', 500)
    }


    }
}