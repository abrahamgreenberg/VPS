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

        // Extract book node string (full, not just before comma)
        const bookNode = document.querySelector("h4");
        const bookTitle = bookNode
            ? bookNode.textContent.split(",")[0].trim()
            : "";

        // Extract halachot
        const halachot = [];
        const subtitleNodes = document.querySelectorAll("h3 > a");
        subtitleNodes.forEach((subtitleNode) => {
            let subtitle = subtitleNode.textContent.trim();
            const url = subtitleNode.getAttribute("href") || "";

            // Extract chapter and halacha number from the URL (e.g. https://ph.yhb.org.il//20-05-10/)
            let chapterNumber = null;
            let halachaNumber = null;
            const urlMatch = url.match(/(\d+)-(\d+)-(\d+)/);
            if (urlMatch) {
                chapterNumber = parseInt(urlMatch[2], 10);
                halachaNumber = parseInt(urlMatch[3], 10);
            }

            // Remove leading Hebrew number and dash from the subtitle, if present
            subtitle = subtitle.replace(/^([א-ת"׳״\s-]+)-\s*/, "").trim();

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

            halachot.push({
                subtitle,
                halacha,
                url,
                bookTitle,
                chapterNumber,
                halachaNumber,
            });
        });

        logger.info(
            `Scrape completed: book "${bookTitle}", ${halachot.length} halachot`
        );

        return { bookTitle, halachot };
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
        const { bookTitle, halachot } = await scrapePeninei(targetUrl);

        logger.info(
            `Scrape complete — extracted ${halachot.length} halachot from book "${bookTitle}"`
        );
        return { bookTitle, halachot };
    } catch (err) {
        logger.error(
            `Scrape failed for date ${date.toISOString()}: ${err.message}`
        );
        logger.debug(err.stack);
        throw err;
    }
};

export default main;
