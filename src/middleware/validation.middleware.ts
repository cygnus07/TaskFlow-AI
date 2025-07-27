import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../utils/errors.js";


export const validateProjectInput = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const { name, startDate, endDate } = req.body

    if(req.method === 'POST' && !name){
        return next(new ValidationError('Project name is required'))
    }

    if(name && name.length > 100){
        return next(new ValidationError('Project name cannot exceed 100 characters'))
    }

    if(startDate && endDate){
        const start = new Date(startDate)
        const end = new Date(endDate)

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            return next(new ValidationError('Invalid date format'))
        }
        if(end < start){
            return next(new ValidationError('End date must be after start date'))
        }
    }


    next()
}