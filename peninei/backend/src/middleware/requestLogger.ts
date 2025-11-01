import express from "express";
import { createLogger } from "../logger.js";

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

const logger = createLogger("request");

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const BACKEND_DEBUG_REQUESTS =
        process.env.BACKEND_DEBUG_REQUESTS === "true";

    if (!BACKEND_DEBUG_REQUESTS) {
        return next();
    }

    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(
            `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
        );
    });
    next();
};
