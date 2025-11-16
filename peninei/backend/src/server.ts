// server.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import scheduler from "./scheduled/index";
import { createLogger } from "./logger";
import { CacheManager } from "./utils/CacheManager";
import { asyncHandler, errorHandler } from "./middleware/errorHandler";
import { corsMiddleware, initializeCors } from "./middleware/cors";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter, initializeRateLimiter } from "./middleware/rateLimiter";
import { DateSchema, MonthYearSchema, SyncRequestSchema } from "./schema";

scheduler(); // start scheduled jobs

const logger = createLogger("server");
const app = express();
const prisma = new PrismaClient();

const BACKEND_DEBUG_RESULTS = process.env.BACKEND_DEBUG_RESULTS === "true";

const halachaCache = new CacheManager(
    async (date: Date) => {
        const halachas = await prisma.halacha.findMany({
            where: { date: date },
            include: { lines: { orderBy: [{ id: "asc" }] } },
            orderBy: [{ chapterNumber: "asc" }, { halachaNumber: "asc" }],
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
            select: {
                date: true,
            },
            where: {
                date: {
                    gte: start,
                    lt: end,
                },
            },
            distinct: ["date"],
            orderBy: [{ date: "asc" }],
        });
        logger.debug(
            halachot.map((h) => {
                h.date.setHours(6, 0, 0, 0);
                return h.date.toISOString().split("T")[0];
            })
        );
        const dates = [
            ...new Set(
                halachot.map((e) => {
                    e.date.setHours(6, 0, 0, 0);
                    return e.date.toISOString().split("T")[0];
                })
            ),
        ];

        logger.debug(dates);

        return dates;
    },
    6 * 60 * 60 * 1000,
    "availableHalachotCache"
);

const SYNC_PREV_DAY = 2;
const SYNC_NEXT_DAY = 3;

const syncCache = new CacheManager(
    async () => {
        const now = new Date();
        now.setHours(6, 0, 0, 0);
        const start = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() - SYNC_PREV_DAY
            )
        );
        const end = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + SYNC_NEXT_DAY + 1
            )
        );

        const halachotInWindow = await prisma.halacha.findMany({
            where: {
                date: {
                    gte: start,
                    lt: end,
                },
            },
        });
        const serverMap = new Map(
            halachotInWindow.map((halacha) => [halacha.id, halacha])
        );

        return { serverMap, halachotInWindow } as const;
    },
    12 * 60 * 60 * 1000,
    "syncCache"
);

// ---------------------------
// Middleware
// ---------------------------
initializeCors();
initializeRateLimiter();
app.use(corsMiddleware);
app.use(rateLimiter);
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
        const { data: date, success, error } = DateSchema.safeParse(dateParam);
        if (!success) {
            logger.warn(`Invalid date format received: "${dateParam}"`);
            return res.status(400).json({ error });
        }

        logger.debug(`Fetching halachot for date: ${dateParam}`);

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
        const monthParam = req.query.month;

        const {
            data: month,
            success,
            error,
        } = MonthYearSchema.safeParse(monthParam);
        if (!success) {
            logger.warn(`Invalid month format received: "${monthParam}"`);
            return res.status(400).json({ error });
        }

        if (!month)
            return res
                .status(400)
                .json({ error: "Month query parameter is required" });

        const dates = await availableHalachotCache.get(month);
        return res.json({ dates });
    })
);

app.post(
    "/api/halachot/sync",
    asyncHandler(async (req, res) => {
        const {
            data: clientHalachotObj,
            success,
            error,
        } = SyncRequestSchema.safeParse(req.body);
        if (!success) {
            logger.warn(
                `Invalid sync request received: "${JSON.stringify(req.body)}"`
            );
            return res.status(400).json({ error });
        }
        const { clientHalachot } = clientHalachotObj;

        const clientMap = new Map(
            clientHalachot.map((halacha) => [halacha[0], halacha[1]])
        );

        const { serverMap, halachotInWindow } = await syncCache.get(
            "halacha-sync"
        );

        const toDelete = Array.from(clientMap.keys()).filter(
            (id) => !serverMap.has(id)
        );

        const toCreateOrUpdate = halachotInWindow.filter((halacha) => {
            const clientVersion = clientMap.get(halacha.id);
            return !clientVersion || clientVersion < halacha.version;
        });

        res.json({
            toDelete,
            toCreateOrUpdate,
        });
    })
);
// ---------------------------
// Error handling middleware (must be last)
// ---------------------------
app.use(errorHandler);

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.BACKEND_API_PORT || "5002";
app.listen(5002, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
