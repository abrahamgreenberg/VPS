import express from "express";
import { createLogger } from "../logger.js";
import { httpRequestsTotal, httpRequestDuration } from "../telemetry";

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

    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const labels = {
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode,
        };
        httpRequestsTotal.add(1, labels);
        httpRequestDuration.record(duration, labels);

        if (BACKEND_DEBUG_REQUESTS) {
            logger.info(
                `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
            );
        }
    });
    next();
};
