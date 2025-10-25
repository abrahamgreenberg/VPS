import { createLogger } from "../logger.js";
import axios from "axios";
import { JSDOM } from "jsdom";

const logger = createLogger("scraper");

// ============================
// SCRAPE PENINEI HALACHA
// ============================
const scrapePeninei = async (url) => {
    logger.info(`Fetching Peninei Halacha HTML from ${url}`);

    try {
        const { data: html } = await axios.get(url);
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract book title
        const bookNode = document.querySelector("h4");
        const book = bookNode ? bookNode.textContent.split(",")[0].trim() : "";

        // Extract halachot
        const halachot = [];
        const subtitleNodes = document.querySelectorAll("h3 > a");
        subtitleNodes.forEach((subtitleNode) => {
            const subtitle = subtitleNode.textContent.trim();
            const url = subtitleNode.getAttribute("href") || "";

            // Find the next <p> with a <br> after this subtitleNode's parent (h3)
            let halacha = "";
            let el = subtitleNode.parentElement.nextElementSibling;
            while (el) {
                if (el.matches && el.matches("p:has(br)")) {
                    halacha = el.textContent
                        .trim()
                        .replace(/\n+/g, " ")
                        .replace(/\[\d+\]/g, ""); // Remove [number]
                    break;
                }
                el = el.nextElementSibling;
            }

            halachot.push({ subtitle, halacha, url });
        });

        logger.info(
            `Scrape completed: book "${book}", ${halachot.length} halachot`
        );

        return { book, halachot };
    } catch (err) {
        logger.error(`Error scraping ${url}: ${err.message}`);
        logger.error(err.stack);
        throw err;
    }
};

// ============================
// MAIN
// ============================
const main = async (date) => {
    const targetUrl = `https://ph.yhb.org.il/wp-content//plugins//db-connect//py0.php?date=${date.getTime()}`;
    logger.info(`Starting scrape for date: ${date.toISOString()}`);

    try {
        const { book, halachot } = await scrapePeninei(targetUrl);

        logger.info(
            `Scrape complete — extracted ${halachot.length} halachot from book "${book}"`
        );
        return { book, halachot };
    } catch (err) {
        logger.error(
            `Scrape failed for date ${date.toISOString()}: ${err.message}`
        );
        logger.debug(err.stack);
        throw err;
    }
};

export default main;
