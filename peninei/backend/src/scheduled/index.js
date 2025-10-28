import { PrismaClient } from "@prisma/client";
import schedule from "node-schedule";
import { createLogger } from "../logger.js";
import {
    scrape_halachot_for_date_range,
    latest_scraped_date,
} from "./scrapeHalacha.js";
import { parse_halachot_with_ai } from "./parseHalacha.js";

const logger = createLogger("scheduler");

const BACKEND_POPULATE_INITIAL_DATABASE =
    process.env.BACKEND_POPULATE_INITIAL_DATABASE === "true";

const runDailyScraper = async () => {
    logger.info("Running daily scraper job");

    try {
        const today = new Date();
        const oneWeekAhead = new Date(today);
        oneWeekAhead.setDate(today.getDate() + 7);

        const lastScrapedDate = await latest_scraped_date();
        if (lastScrapedDate) {
            const nextDate = new Date(lastScrapedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            logger.info(
                `Resuming scrape from ${nextDate.toDateString()} to ${oneWeekAhead.toDateString()}`
            );
            await scrape_halachot_for_date_range(nextDate, oneWeekAhead);
        } else {
            logger.info(
                `Starting fresh scrape to ${oneWeekAhead.toDateString()}`
            );
            await scrape_halachot_for_date_range(today, oneWeekAhead);
        }
        logger.info("Daily scrape completed successfully");
        await parse_halachot_with_ai();
    } catch (err) {
        logger.error("Error during daily scrape: " + err.message);
        logger.debug(err.stack);
    }
};

const main = async () => {
    logger.info("Starting scheduled scraping service");

    // Daily scraper job - runs at 4 AM, scrapes one week in advance
    schedule.scheduleJob("0 4 * * *", async () => {
        logger.info("Scheduled daily scraper job triggered (4 AM)");
        await runDailyScraper();
    });

    // Hourly AI parser job - processes halachot that need AI parsing (skip 4 AM)
    schedule.scheduleJob("0 0-3,5-23 * * *", async () => {
        logger.info("Scheduled hourly AI parser job triggered");

        try {
            await parse_halachot_with_ai();
            logger.info("Scheduled AI parsing completed successfully");
        } catch (err) {
            logger.error("Error during scheduled AI parsing: " + err.message);
            logger.debug(err.stack);
        }
    });

    if (BACKEND_POPULATE_INITIAL_DATABASE) {
        logger.info(
            "BACKEND_POPULATE_INITIAL_DATABASE is true, running daily scraper on startup"
        );
        await runDailyScraper();
    } else {
        logger.info(
            "BACKEND_POPULATE_INITIAL_DATABASE not enabled, skipping startup scrape"
        );
    }
};

export default main;
