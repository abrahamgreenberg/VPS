// server.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const scheduler = require("./scheduled");
const { createLogger } = require("./logger");

const logger = createLogger(__filename);

scheduler(); // start scheduled jobs

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// ---------------------------
// Middleware: log incoming requests
// ---------------------------
app.use((req, res, next) => {
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

    if (isNaN(date.getTime())) {
        logger.warn(`Invalid date format received: "${dateParam}"`);
        return res.status(400).json({ error: "Invalid date format" });
    }

    try {
        const halachot = await prisma.halacha.findMany({ where: { date } });
        logger.info(
            `Returned ${
                halachot.length
            } halachot for date ${date.toISOString()}`
        );
        return res.json(halachot);
    } catch (err) {
        logger.error(
            `Error fetching halachot for date ${dateParam}: ${err.message}`
        );
        logger.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------
// GET available dates (optionally by month)
// ---------------------------
app.get("/api/available-dates", async (req, res) => {
    const month = req.query.month;
    let where = {};

    if (month) {
        const [year, m] = month.split("-").map(Number);
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where = { date: { gte: start, lt: end } };
        logger.debug(`Filtering available dates for month: ${month}`);
    }

    try {
        const events = await prisma.halacha.findMany({
            where,
            select: { date: true },
        });

        const dates = [
            ...new Set(events.map((e) => e.date.toISOString().split("T")[0])),
        ];

        logger.info(
            `Returned ${dates.length} available dates${
                month ? " for " + month : ""
            }`
        );

        return res.json({ dates });
    } catch (err) {
        logger.error(`Error fetching available dates: ${err.message}`);
        logger.debug(err.stack);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.API_PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
