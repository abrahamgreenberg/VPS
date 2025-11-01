// TODO: MAKE MIDDLEWARE TO HANDLE INTERNAL SERVER ERRORS

// server.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import scheduler from "./scheduled/index.js";
import { createLogger } from "./logger.js";
import { CacheManager } from "./utils/CacheManager.ts";

const logger = createLogger("server");

scheduler(); // start scheduled jobs

const app = express();
const prisma = new PrismaClient();

const BACKEND_DEBUG_REQUESTS = process.env.BACKEND_DEBUG_REQUESTS === "true";
const BACKEND_DEBUG_RESULTS = process.env.BACKEND_DEBUG_RESULTS === "true";

const halachaCache = new CacheManager(
    async (date: Date) => {
        const halachas = await prisma.halacha.findMany({
            where: { date: date },
            include: { lines: true },
        });
        return halachas;
    },
    6 * 60 * 60 * 1000,
    "halachaCache"
);

const availableHalachotCache = new CacheManager(
    async (dateParam: string) => {
        const [year, m] = dateParam.split("-").map(Number);
        const start = new Date(Date.UTC(year, m - 1, 1));
        const end = new Date(Date.UTC(year, m, 1));
        const halachot = await prisma.halacha.findMany({
            where: {
                date: {
                    gte: start,
                    lt: end,
                },
            },
            include: { lines: true },
        });

        const dates = [
            ...new Set(halachot.map((e) => e.date.toISOString().split("T")[0])),
        ];

        return dates;
    },
    6 * 60 * 60 * 1000,
    "availableHalachotCache"
);

// ---------------------------
// Optional: Allow CORS if env var is set
// ---------------------------
const allowedOrigin = process.env.BACKEND_CORS_ALLOWED_URL;
if (allowedOrigin) {
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", allowedOrigin);
        res.header(
            "Access-Control-Allow-Methods",
            "GET,PUT,POST,DELETE,OPTIONS"
        );
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        );
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        next();
    });
    logger.info(
        `CORS enabled for origin: ${allowedOrigin} (BACKEND_CORS_ALLOWED_URL)`
    );
}

app.use(express.json());

// ---------------------------
// Middleware: log incoming requests
// ---------------------------
app.use((req, res, next) => {
    if (!BACKEND_DEBUG_REQUESTS) return next();
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(
            `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
        );
    });
    next();
});

// ---------------------------
// GET halachas by date
// ---------------------------
app.get("/api", (req, res) => {
    logger.info("Log!");
    return res.status(200).json({ result: "Ok!" });
});

app.get("/api/halachas/:date", async (req, res) => {
    const dateParam = req.params.date;
    const date = new Date(dateParam);
    logger.debug(`Fetching halachot for date: ${dateParam}`);
    logger.debug(dateParam);
    logger.debug(date);

    if (isNaN(date.getTime())) {
        logger.warn(`Invalid date format received: "${dateParam}"`);
        return res.status(400).json({ error: "Invalid date format" });
    }

    try {
        const halachot = await halachaCache.get(date);

        if (BACKEND_DEBUG_RESULTS) logger.debug(halachot);
        logger.info(
            `Returned ${halachot.length} halachot for date ${dateParam}`
        );
        return res.json(halachot);
    } catch (err) {
        const error = err as Error;
        logger.error(
            `Error fetching halachot for date ${dateParam}: ${error.message}`
        );
        logger.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------
// GET available dates (optionally by month)
// ---------------------------
app.get("/api/available-dates", async (req, res) => {
    const month = req.query.month as string | undefined;

    if (!month)
        return res
            .status(400)
            .json({ error: "Month query parameter is required" });

    try {
        const dates = await availableHalachotCache.get(month);
        return res.json({ dates });
    } catch (err) {
        const error = err as Error;
        logger.error(`Error fetching available dates: ${error.message}`);
        logger.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.BACKEND_API_PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
