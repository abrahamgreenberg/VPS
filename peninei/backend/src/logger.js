// src/logger.js
import winston from "winston";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // load .env

const { combine, timestamp, printf, colorize } = winston.format;

// ==========================
// Custom log format
// ==========================
const logFormat = printf(({ level, message, timestamp, file }) => {
    return `[${timestamp}] [${level}]${file ? ` [${file}]` : ""}: ${message}`;
});

// ==========================
// Create a logger factory
// ==========================
export function createLogger(file = "app") {
    const logLevel = process.env.LOG_LEVEL || "info";

    return winston.createLogger({
        level: logLevel,
        format: combine(
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            logFormat
        ),
        defaultMeta: { file },
        transports: [
            // Console logs — perfect for Docker
            new winston.transports.Console({
                format: combine(
                    colorize(),
                    timestamp({ format: "HH:mm:ss" }),
                    logFormat
                ),
            }),

            // File logs — stored locally (Docker can mount /logs)
            new winston.transports.File({
                filename: path.resolve("logs", "app.log"),
                maxsize: 5 * 1024 * 1024, // 5 MB rotation threshold
                maxFiles: 5,
            }),
        ],
    });
}
