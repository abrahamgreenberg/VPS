const { ai, scraper } = require("./lib");
const { PrismaClient } = require("@prisma/client");
const schedule = require("node-schedule");
const { createLogger } = require("./logger");

const logger = createLogger(__filename);

Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

const prisma = new PrismaClient();

// ======================================
// SCRAPE HALACHOT FOR A GIVEN DATE
// ======================================
const scrape_halachot = async (date) => {
    logger.info(`Starting scrape for ${date.toDateString()}`);

    try {
        const scrapedHalachot = await scraper(date);
        logger.info(
            `Scraper returned ${
                scrapedHalachot.length
            } halachot for ${date.toDateString()}`
        );

        for (const scrapedHalacha of scrapedHalachot) {
            const { title, url, text } = scrapedHalacha;
            logger.debug(`Processing halacha: "${title}" (${url})`);

            try {
                const existing = await prisma.halacha.findUnique({
                    where: { url },
                });
                if (existing) {
                    logger.info(`Skipping existing halacha: ${title}`);
                    continue;
                }

                // Save Hebrew halacha
                const halacha = await prisma.halacha.create({
                    data: {
                        heTitle: title,
                        url,
                        heText: text,
                        date,
                    },
                });

                logger.info(`Saved new halacha: "${halacha.heTitle}"`);

                // Translate and save lines
                const translated = await ai(text);
                logger.info(
                    `Translation complete — ${translated.length} lines for "${title}"`
                );

                await prisma.halachaLine.createMany({
                    data: translated.map((t) => ({
                        ...t,
                        halachaId: halacha.id,
                    })),
                });

                logger.info(`Saved ${translated.length} translation lines`);
            } catch (err) {
                logger.error(
                    `Failed processing halacha "${scrapedHalacha.title}": ${err.message}`
                );
                logger.debug(err.stack);
            }
        }

        logger.info(`Completed scrape for ${date.toDateString()}`);
    } catch (err) {
        logger.error(
            `Scrape failed for ${date.toDateString()}: ${err.message}`
        );
        logger.debug(err.stack);
    }
};

// ======================================
// SCRAPE HALACHOT FOR A WEEK
// ======================================
const scrape_halachot_for_week = async (date) => {
    logger.info(`Starting weekly scrape from ${date.toDateString()}`);

    let start = new Date(date);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        logger.info(`Scraping day ${i + 1}/7: ${start.toDateString()}`);
        await scrape_halachot(start);
        start = start.addDays(1);
    }

    logger.info("Weekly scrape completed successfully");
};

// ======================================
// MAIN SCHEDULER
// ======================================
const main = async () => {
    logger.info("Starting scheduled scraping service");

    // Schedule weekly scrape — every Sunday at 4:00 AM
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

    // Populate database if empty
    const halachotCount = await prisma.halacha.count();
    if (halachotCount === 0) {
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
        logger.info(`Database already contains ${halachotCount} halachot`);
    }
};

module.exports = main;
