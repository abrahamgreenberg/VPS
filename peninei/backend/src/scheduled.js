const { ai, scraper } = require("./lib");
const { PrismaClient } = require("@prisma/client");
const schedule = require("node-schedule");

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

const prisma = new PrismaClient();

const scrape_halachot = async (date) => {
    const scrapedHalachot = await scraper(date);
    for (const scrapedHalacha of scrapedHalachot) {
        try {
            const { title, url, text } = scrapedHalacha;

            const existing = await prisma.halacha.findUnique({
                where: { url },
            });

            if (existing) continue;

            const halacha = await prisma.halacha.create({
                data: {
                    heTitle: title,
                    url,
                    heText: text,
                    date,
                },
            });

            const translated = await ai(text);

            await prisma.halachaLine.createMany({
                data: translated.map((t) => ({ ...t, halachaId: halacha.id })),
            });
        } catch (e) {
            console.error("Failed to scrape or translate halacha");
            console.error(e);
        }
    }
};

const scrape_halachot_for_week = async (date) => {
    date.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        await scrape_halachot(date);
        date.addDays(1);
    }
};

const main = async () => {
    schedule.scheduleJob("0 4 * * SUN", async () => {
        try {
            await scrape_halachot_for_week(new Date());
        } catch (e) {
            console.error("Error scraping halachot");
            console.error(error);
        }
    });

    // POPULATE DATABASE IF NOTHING EXISTS
    const halachot = await prisma.halacha.count();
    if (halachot === 0) {
        const today = new Date();
        const lastSunday = new Date(today);

        const dayOfWeek = today.getDay();

        lastSunday.setDate(today.getDate() - dayOfWeek);

        scrape_halachot_for_week(lastSunday);
    }
};
