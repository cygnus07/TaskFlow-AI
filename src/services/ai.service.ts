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
}