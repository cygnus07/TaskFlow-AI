import { config } from "../config/index.js";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";


export const checkAIEnabled = (_req: Request, _res: Response, next: NextFunction) => {
    if(!config.ai.enabled){
        return next(new AppError('AI features are not enabled, Please upgrade your plan', 403))
    }

    next()
}