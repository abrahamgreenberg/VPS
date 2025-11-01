// server.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import scheduler from "./scheduled/index.js";
import { createLogger } from "./logger.js";
import { CacheManager } from "./utils/CacheManager.ts";
import { asyncHandler, errorHandler } from "./middleware/errorHandler.ts";
import { corsMiddleware, initializeCors } from "./middleware/cors.ts";
import { requestLogger } from "./middleware/requestLogger.ts";

scheduler(); // start scheduled jobs

const logger = createLogger("server");
const app = express();
const prisma = new PrismaClient();

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
// Middleware
// ---------------------------
initializeCors();
app.use(corsMiddleware);
app.use(express.json());
app.use(requestLogger);

// ---------------------------
// GET halachas by date
// ---------------------------
app.get("/api", (req, res) => {
    logger.info("Log!");
    return res.status(200).json({ result: "Ok!" });
});

app.get(
    "/api/halachas/:date",
    asyncHandler(async (req, res) => {
        const dateParam = req.params.date;
        const date = new Date(dateParam);
        logger.debug(`Fetching halachot for date: ${dateParam}`);
        logger.debug(dateParam);
        logger.debug(date);

        if (isNaN(date.getTime())) {
            logger.warn(`Invalid date format received: "${dateParam}"`);
            return res.status(400).json({ error: "Invalid date format" });
        }

        const halachot = await halachaCache.get(date);

        if (BACKEND_DEBUG_RESULTS) logger.debug(halachot);
        logger.info(
            `Returned ${halachot.length} halachot for date ${dateParam}`
        );
        return res.json(halachot);
    })
);

// ---------------------------
// GET available dates (optionally by month)
// ---------------------------
app.get(
    "/api/available-dates",
    asyncHandler(async (req, res) => {
        const month = req.query.month as string | undefined;

        if (!month)
            return res
                .status(400)
                .json({ error: "Month query parameter is required" });

        const dates = await availableHalachotCache.get(month);
        return res.json({ dates });
    })
);

// ---------------------------
// Error handling middleware (must be last)
// ---------------------------
app.use(errorHandler);

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.BACKEND_API_PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
