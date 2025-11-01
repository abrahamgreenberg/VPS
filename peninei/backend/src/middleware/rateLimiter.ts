import express from "express";
import { createLogger } from "../logger.js";

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

const logger = createLogger("rateLimiter");

interface RateLimitStore {
    [ip: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

// Configuration
const WINDOW_MS = parseInt(process.env.BACKEND_RATE_LIMIT_WINDOW_MS || "60000"); // 1 minute default
const MAX_REQUESTS = parseInt(
    process.env.BACKEND_RATE_LIMIT_MAX_REQUESTS || "100"
); // 100 requests default

// Clean up old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((ip) => {
        if (store[ip].resetTime < now) {
            delete store[ip];
        }
    });
}, 10 * 60 * 1000);

export const rateLimiter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Get client IP (consider proxy headers)
    const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "unknown";

    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[ip] || store[ip].resetTime < now) {
        store[ip] = {
            count: 1,
            resetTime: now + WINDOW_MS,
        };
        return next();
    }

    // Increment request count
    store[ip].count++;

    // Check if limit exceeded
    if (store[ip].count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((store[ip].resetTime - now) / 1000);
        logger.warn(
            `Rate limit exceeded for IP ${ip}: ${store[ip].count} requests in window`
        );

        res.set({
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(store[ip].resetTime / 1000)),
        });

        return res.status(429).json({
            error: "Too many requests, please try again later.",
            retryAfter,
        });
    }

    // Add rate limit headers
    res.set({
        "X-RateLimit-Limit": String(MAX_REQUESTS),
        "X-RateLimit-Remaining": String(MAX_REQUESTS - store[ip].count),
        "X-RateLimit-Reset": String(Math.ceil(store[ip].resetTime / 1000)),
    });

    next();
};

export const initializeRateLimiter = () => {
    logger.info(
        `Rate limiter initialized: ${MAX_REQUESTS} requests per ${
            WINDOW_MS / 1000
        }s window`
    );
};
