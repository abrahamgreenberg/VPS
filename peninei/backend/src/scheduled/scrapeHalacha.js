import { scraper } from "../lib/index.js";
import { PrismaClient } from "@prisma/client";
import { createLogger } from "../logger.js";

const logger = createLogger("scraper");
const prisma = new PrismaClient();

const BACKEND_WRITE_TO_DB = process.env.BACKEND_WRITE_TO_DB === "true";

Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

function numberToGematria(num) {
    if (num < 1 || num > 100) return "";
    const letters = [
        "",
        "א",
        "ב",
        "ג",
        "ד",
        "ה",
        "ו",
        "ז",
        "ח",
        "ט",
        "י",
        "כ",
        "ל",
        "מ",
        "נ",
        "ס",
        "ע",
        "פ",
        "צ",
    ];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    if (num === 15) return "ט״ו";
    if (num === 16) return "ט״ז";
    if (num === 100) return "ק";

    let result = "";
    let n = num;

    // Handle tens
    if (n >= 10) {
        const t = Math.floor(n / 10);
        if (t > 0) result += tens[t];
        n = n % 10;
    }
    // Handle units
    if (n > 0) result += letters[n];

    // Add gershayim (״) before last letter if >9, otherwise geresh (׳) for single letter >9
    if (result.length > 1) {
        result = result.slice(0, -1) + "״" + result.slice(-1);
    } else if (num > 9) {
        result += "׳";
    }
    return result;
}

const scrape_halachot_for_date = async (date) => {
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
            try {
                const { subtitle, halacha, url, chapterNumber, halachaNumber } =
                    scrapedHalacha;
                logger.debug(`Processing halacha: "${subtitle}"`);

                // Prepend perek/halacha numbers if present
                let heTitle = subtitle;
                let prefix = "";
                if (chapterNumber) {
                    prefix += `פרק ${numberToGematria(chapterNumber)}, `;
                }
                if (halachaNumber) {
                    prefix += `הלכה ${numberToGematria(halachaNumber)}, `;
                }
                if (prefix) {
                    heTitle = `${prefix}${heTitle}`;
                }

                const existing = await prisma.halacha.findUnique({
                    where: { url },
                });
                if (existing) {
                    logger.info(`Skipping existing halacha: ${subtitle}`);
                    continue;
                }

                const halachaData = {
                    heTitle,
                    enTitle: null,
                    url,
                    heText: halacha,
                    date,
                    chapterNumber,
                    halachaNumber,
                    parseWithAi: true,
                    book: { connect: { id: bookRecord.id } },
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
            } catch (err) {
                logger.error(
                    `Failed processing halacha "${scrapedHalacha.subtitle}": ${err.message}`
                );
                logger.error(err);
            }
        }

        logger.info(`Completed scrape for ${date.toDateString()}`);
    } catch (err) {
        logger.error(`Scrape failed for ${date.toDateString()}`);
        logger.error(err);
    }
};

export const scrape_halachot_for_date_range = async (startDate, endDate) => {
    logger.info(
        `Starting scrape for date range: ${startDate.toDateString()} to ${endDate.toDateString()}`
    );

    let currentDate = new Date(startDate);
    currentDate.setHours(6, 0, 0, 0); // Set to 6 AM to avoid timezone issues

    while (currentDate <= endDate) {
        logger.info(`Scraping date: ${currentDate.toDateString()}`);
        await scrape_halachot_for_date(currentDate);
        currentDate = currentDate.addDays(1);
    }

    logger.info(
        `Completed scrape for date range: ${startDate.toDateString()} to ${endDate.toDateString()}`
    );
};

export const latest_scraped_date = async () => {
    const latestHalacha = await prisma.halacha.findFirst({
        orderBy: { date: "desc" },
    });
    return latestHalacha ? latestHalacha.date : null;
};
