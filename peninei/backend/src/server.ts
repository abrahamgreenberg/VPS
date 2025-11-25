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

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

scheduler(); // start scheduled jobs

const logger = createLogger("server");
const app = express();
const prisma = new PrismaClient();

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Peninei Halacha API",
            version: "1.0.0",
            description: "API documentation for Peninei Halacha backend",
        },
        servers: [
            {
                url: "http://localhost:5002",
            },
        ],
    },
    apis: [__filename], // You can add more files here for annotation-based docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
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
const SYNC_NEXT_DAY = 7;

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

        const dbHalachot = await prisma.halacha.findMany({
            where: {
                date: {
                    gte: start,
                    lt: end,
                },
            },
            include: { lines: { orderBy: [{ id: "asc" }] } },
        });
        const halachotInWindow: typeof dbHalachot & { dateString: string }[] =
            dbHalachot.map((halacha) => {
                halacha.date.setHours(6, 0, 0, 0);
                return {
                    dateString: halacha.date.toISOString().split("T")[0],
                    ...halacha,
                };
            });
        const serverMap = new Map(
            halachotInWindow.map((halacha) => [halacha.id, halacha])
        );

        return {
            serverMapObj: Object.fromEntries(serverMap),
            halachotInWindow,
        } as const;
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

// Swagger UI route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------
// GET halachas by date
// ---------------------------
/**
 * @openapi
 * /api:
 *   get:
 *     summary: Health check or test endpoint
 *     responses:
 *       200:
 *         description: API is up and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   example: Ok!
 *
 * /api/halachas/{date}:
 *   get:
 *     summary: Get halachot by date
 *     parameters:
 *       - in: path
 *         name: date
 *         schema:
 *           type: string
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of halachot for the date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Invalid date format
 *
 * /api/available-dates:
 *   get:
 *     summary: Get available halacha dates for a month
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}-(0[1-9]|1[0-2])$'
 *         required: true
 *         description: Month in YYYY-MM format
 *     responses:
 *       200:
 *         description: List of available dates for the month
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dates:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: 2025-11-16
 *       400:
 *         description: Invalid month format
 *
 * /api/halachot/sync:
 *   post:
 *     summary: Sync halachot between client and server
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientHalachot:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 example: [[1,2],[2,3]]
 *     responses:
 *       200:
 *         description: Sync result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 toDelete:
 *                   type: array
 *                   items:
 *                     type: number
 *                 toCreateOrUpdate:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid sync request
 */
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
        logger.info("Received sync request");
        const {
            data: clientHalachotObj,
            success,
            error,
        } = SyncRequestSchema.safeParse(req.body);
        logger.debug(`Sync request body: ${JSON.stringify(req.body)}`);
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

        const { serverMapObj, halachotInWindow } = await syncCache.get(
            "halacha-sync"
        );
        const serverMap = new Map(Object.entries(serverMapObj));

        const toDelete = Array.from(clientMap.keys()).filter(
            (id) => !serverMap.has(id.toString())
        );

        const toUpdate = halachotInWindow.filter((halacha) => {
            const clientVersion = clientMap.get(halacha.id);
            return clientVersion < halacha.version;
        });

        const toCreate = halachotInWindow.filter((halacha) => {
            const clientVersion = clientMap.get(halacha.id);
            return !clientVersion;
        });

        res.json({
            toDelete,
            toCreate,
            toUpdate,
            toUpdateIds: toUpdate.map((h) => h.id),
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
