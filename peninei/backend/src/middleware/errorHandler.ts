import express from "express";
import { createLogger } from "../logger.js";

const logger = createLogger("errorHandler");

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error(`Error on ${req.method} ${req.originalUrl}: ${err.message}`);
    logger.error(err.stack || err);

    // Don't send error if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({ error: "Internal server error" });
};
