import express from "express";
import { createLogger } from "../logger.js";

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

const logger = createLogger("cors");

export const corsMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const allowedOrigin = process.env.BACKEND_CORS_ALLOWED_URL;

    if (!allowedOrigin) {
        return next();
    }

    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
};

export const initializeCors = () => {
    const allowedOrigin = process.env.BACKEND_CORS_ALLOWED_URL;
    if (allowedOrigin) {
        logger.info(
            `CORS enabled for origin: ${allowedOrigin} (BACKEND_CORS_ALLOWED_URL)`
        );
    }
};
