// server.js
// const express = require("express");
// const { PrismaClient } = require("@prisma/client");
// const scheduler = require("./scheduled");
// const { createLogger } = require("./logger");
import express from "express";
import { PrismaClient } from "@prisma/client";
import scheduler from "./scheduled.js";
import { createLogger } from "./logger.js";

// Optionally load .env if using dotenv (uncomment if needed)
// import dotenv from "dotenv";
// dotenv.config();
// ---------------------------
// Optional: Allow CORS if env var is set
// ---------------------------

const logger = createLogger("server");

scheduler(); // start scheduled jobs

const app = express();
const prisma = new PrismaClient();

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
        // For @db.Date, Prisma expects a Date object
        const halachot = await prisma.halacha.findMany({
            where: {
                date: date,
            },
            include: { lines: true },
        });

        logger.debug(halachot);
        logger.info(
            `Returned ${halachot.length} halachot for date ${dateParam}`
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
        // Use a date range for the month: gte first of month, lt first of next month
        const start = new Date(Date.UTC(year, m - 1, 1));
        const end = new Date(Date.UTC(year, m, 1));
        where = {
            date: {
                gte: start,
                lt: end,
            },
        };
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
const PORT = process.env.BACKEND_API_PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
