// src/utils/logger.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, file }) => {
    return `[${timestamp}] [${level}]${file ? ` [${file}]` : ""}: ${message}`;
});

// Create a function that returns a logger for a given module/file
export function createLogger(moduleUrl) {
    const file = path.relative(process.cwd(), fileURLToPath(moduleUrl));

    return winston.createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: combine(
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            logFormat
        ),
        transports: [
            // Console logs (for Docker)
            new winston.transports.Console({
                format: combine(colorize(), logFormat),
            }),

            // File logs (rotated by Docker or external log driver)
            new winston.transports.File({
                filename: path.join(__dirname, "../../logs/app.log"),
            }),
        ],
        defaultMeta: { file },
    });
}
