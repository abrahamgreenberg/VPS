import { ai, scraper } from "./lib/index.js";
import { PrismaClient } from "@prisma/client";
import schedule from "node-schedule";

import { createLogger } from "./logger.js";

const logger = createLogger("scheduler");

Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

const prisma = new PrismaClient();

const BACKEND_WRITE_TO_DB = process.env.BACKEND_WRITE_TO_DB === "true";
const BACKEND_PROCESS_WITH_AI = process.env.BACKEND_PROCESS_WITH_AI === "true";
const BACKEND_POPULATE_INITIAL_DATABASE =
    process.env.BACKEND_POPULATE_INITIAL_DATABASE === "true";

const scrape_halachot = async (date) => {
    logger.info(`Starting scrape for ${date.toDateString()}`);

    try {
        const { bookTitle, halachot } = await scraper(date);
        logger.info(
            `Scraper returned ${
                halachot.length
            } halachot for "${bookTitle}" on ${date.toDateString()}`
        );

        // Book linking logic restored
        let bookRecord = await prisma.book.findUnique({
            where: { title: bookTitle },
        });
        if (!bookRecord) {
            bookRecord = await prisma.book.create({
                data: { title: bookTitle },
            });
            logger.info(`Created new book: "${bookTitle}"`);
        }

        for (const scrapedHalacha of halachot) {
            const { subtitle, halacha, url, chapterNumber, halachaNumber } =
                scrapedHalacha;
            logger.debug(`Processing halacha: "${subtitle}"`);

            try {
                let translated = null;
                let enTitle = null;
                if (BACKEND_PROCESS_WITH_AI) {
                    // Pass both heTitle and heText to ai
                    const aiResult = await ai({
                        heTitle: subtitle,
                        heText: halacha,
                    });

                    logger.debug("---- TRANSLATION ---- ");
                    logger.debug(aiResult);

                    if (!aiResult) {
                        logger.warn(
                            `Skipping halacha "${subtitle}" because AI translation failed`
                        );
                        continue;
                    }
                    enTitle = aiResult.enTitle;
                    translated = aiResult.lines;
                }

                const existing = await prisma.halacha.findUnique({
                    where: { url },
                });
                if (existing) {
                    logger.info(`Skipping existing halacha: ${subtitle}`);
                    continue;
                }

                const halachaData = {
                    heTitle: subtitle,
                    enTitle: enTitle || null,
                    url,
                    heText: halacha,
                    date,
                    chapterNumber,
                    halachaNumber,
                    book: { connect: { id: bookRecord.id } }, // link to Book
                };

                if (!BACKEND_WRITE_TO_DB) {
                    logger.warn(
                        "BACKEND_WRITE_TO_DB is not true, skipping database writes."
                    );
                    logger.debug(halachaData);

                    continue;
                }

                const halachaRecord = await prisma.halacha.create({
                    data: halachaData,
                });

                logger.info(`Saved new halacha: "${halachaRecord.heTitle}"`);
                logger.debug("---- TEXT ---- ");
                logger.debug(halachaRecord);

                if (BACKEND_PROCESS_WITH_AI && translated) {
                    await prisma.halachaLine.createMany({
                        data: translated.map((t) => ({
                            ...t,
                            halachaId: halachaRecord.id,
                        })),
                    });

                    logger.info(`Saved ${translated.length} translation lines`);
                } else {
                    logger.info(
                        "BACKEND_PROCESS_WITH_AI is not true, skipping AI processing."
                    );
                }
            } catch (err) {
                logger.error(
                    `Failed processing halacha "${scrapedHalacha.subtitle}": ${err.message}`
                );
                logger.error(err);
            }
        }

        logger.info(`Completed scrape for ${date.toDateString()}`);
    } catch (err) {
        logger.error(
            `Scrape failed for ${date.toDateString()}: ${err.message}`
        );
        logger.error(err);
    }
};

const scrape_halachot_for_week = async (date) => {
    logger.info(`Starting weekly scrape from ${date.toDateString()}`);

    let start = new Date(date);
    start.setHours(6, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        logger.info(`Scraping day ${i + 1}/7: ${start.toDateString()}`);
        await scrape_halachot(start);

        start = start.addDays(1);
    }

    logger.info("Weekly scrape completed successfully");
};

const main = async () => {
    logger.info("Starting scheduled scraping service");

    schedule.scheduleJob("0 4 * * SUN", async () => {
        logger.info("Scheduled weekly job triggered (Sunday 4AM)");

        try {
            await scrape_halachot_for_week(new Date());
            logger.info("Scheduled weekly scrape completed successfully");
        } catch (err) {
            logger.error(
                "Error during scheduled weekly scrape: " + err.message
            );
            logger.debug(err.stack);
        }
    });

    if (BACKEND_POPULATE_INITIAL_DATABASE) {
        logger.warn("No halachot found in database — populating initial week");

        const today = new Date();
        const lastSunday = new Date(today);
        const dayOfWeek = today.getDay();

        lastSunday.setDate(today.getDate() - dayOfWeek);

        try {
            await scrape_halachot_for_week(lastSunday);
            logger.info("Initial population complete");
        } catch (err) {
            logger.error("Initial population failed: " + err.message);
            logger.debug(err.stack);
        }
    } else {
        logger.info(
            `BACKEND_POPULATE_INITIAL_DATABASE not enabled, skipping initial population`
        );
    }
};

export default main;
