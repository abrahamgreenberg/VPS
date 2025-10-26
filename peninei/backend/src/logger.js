// src/logger.js
import winston from "winston";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config(); // load .env

// Clear log file if requested
if (process.env.BACKEND_CLEAR_LOGS_ON_START === "true") {
    const logPath = path.resolve("logs", "app.log");
    try {
        fs.writeFileSync(logPath, "");
        // eslint-disable-next-line no-console
        console.log(`[logger] Cleared log file at ${logPath}`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[logger] Failed to clear log file at ${logPath}:`, err);
    }
}

// ==========================
// Custom log format
// ==========================
const errorFormatter = winston.format((info) => {
    if (info instanceof Error) {
        return {
            ...info,
            message: info.message,
            stack: info.stack,
        };
    }
    if (info.message instanceof Error) {
        return {
            ...info,
            message: info.message.message,
            stack: info.message.stack,
        };
    }
    return info;
});

const logFormat = winston.format.printf(
    ({ level, message, timestamp, file, stack }) => {
        // Serialize objects to JSON for better logging
        let msg = message;
        if (typeof msg === "object") {
            try {
                msg = JSON.stringify(msg, null, 2);
            } catch {
                msg = String(msg);
            }
        }
        if (stack) {
            msg = `${msg}\n${stack}`;
        }
        return `[${timestamp}] [${level}]${file ? ` [${file}]` : ""}: ${msg}`;
    }
);

// ==========================
// Create a logger factory
// ==========================
export function createLogger(file = "app") {
    const logLevel = process.env.BACKEND_LOG_LEVEL || "info";

    return winston.createLogger({
        level: logLevel,
        format: winston.format.combine(
            errorFormatter(),
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            logFormat
        ),
        defaultMeta: { file },
        transports: [
            // Console logs — perfect for Docker
            new winston.transports.Console({
                format: winston.format.combine(
                    errorFormatter(),
                    winston.format.colorize(),
                    winston.format.timestamp({ format: "HH:mm:ss" }),
                    logFormat
                ),
            }),

            // File logs — stored locally (Docker can mount /logs)
            new winston.transports.File({
                filename: path.resolve("logs", "app.log"),
                maxsize: 5 * 1024 * 1024, // 5 MB rotation threshold
                maxFiles: 5,
                format: winston.format.combine(
                    errorFormatter(),
                    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                    logFormat
                ),
            }),
        ],
    });
}
