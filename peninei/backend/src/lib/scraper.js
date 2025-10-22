const cheerio = require("cheerio");
const axios = require("axios");
const path = require("path");
const { createLogger } = require("../logger");

const logger = createLogger(__filename);

const allowedTags = [
    "p",
    "br",
    "h2",
    "h4",
    "h3",
    "a",
    "iframe",
    "body",
    "html",
    "head",
];

// ============================
// CLEANUP DOM FUNCTION
// ============================
function cleanDom($) {
    logger.debug("Starting DOM cleanup");

    // Remove disallowed tags but keep their contents
    $("*").each((_, el) => {
        const tag = el.tagName?.toLowerCase();
        if (!allowedTags.includes(tag)) $(el).replaceWith($(el).contents());
    });

    $("script").remove();
    $("*").each((_, el) => {
        $(el).removeAttr("style").removeAttr("class").removeAttr("id");
    });

    // Replace YouTube iframes with links
    $("iframe").each((_, el) => {
        const src = $(el).attr("src");
        if (src?.includes("youtube.com/embed/")) {
            const videoUrl = src.replace("/embed/", "/watch?v=");
            const link = $("<a>")
                .attr("href", videoUrl)
                .attr("target", "_blank")
                .text("צפייה בסרטון ביוטיוב");
            $(el).replaceWith(link);
        } else {
            $(el).remove();
        }
    });

    $("body")
        .contents()
        .each((_, el) => {
            if (el.type === "text" && $(el).text().trim() !== "") {
                $(el).remove();
            }
        });

    $('a[href*="ftn"]').remove();

    logger.debug("Finished DOM cleanup");
}

// ============================
// EXTRACT CLEAN HTML
// ============================
const extractHtml = ($) => {
    logger.debug("Extracting cleaned HTML from DOM");

    $("br").remove();

    const innerBody = $("body").html()?.trim() || "";
    const cleanedInner = innerBody
        .replace(/^\s*[\r\n]/gm, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    logger.debug(`Extracted HTML length: ${cleanedInner.length} characters`);

    return `<div>${cleanedInner}</div>`;
};

// ============================
// EXTRACT TITLES & PARAGRAPHS
// ============================
const extractTitlesAndParagraphs = ($) => {
    logger.debug("Extracting titles and paragraphs");

    const titles = [];
    $("h3 > a").each((i, el) => {
        if (i < 2) {
            titles.push({
                text: $(el).text().trim(),
                url: $(el).attr("href"),
            });
        }
    });

    const paragraphs = [];
    $("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text && paragraphs.length < 2) {
            paragraphs.push(text);
        }
    });

    logger.debug(
        `Extracted ${titles.length} titles and ${paragraphs.length} paragraphs`
    );

    return { titles, paragraphs };
};

// ============================
// SCRAPE PENINEI HALACHA
// ============================
const scrapePeninei = async (url) => {
    logger.info(`Fetching Peninei Halacha HTML from ${url}`);

    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        cleanDom($);

        const cleanedHtml = extractHtml($);
        const { titles, paragraphs } = extractTitlesAndParagraphs($);

        logger.info(
            `Scrape completed: ${titles.length} titles, ${paragraphs.length} paragraphs`
        );

        return { html: cleanedHtml, titles, paragraphs };
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
        const { titles, paragraphs } = await scrapePeninei(targetUrl);

        const halachas = titles.map((title, i) => ({
            title: title.text,
            url: title.url,
            text: (paragraphs[i] || "").replace(/\n/g, " "),
        }));

        logger.info(`Scrape complete — extracted ${halachas.length} halachot`);
        return halachas;
    } catch (err) {
        logger.error(
            `Scrape failed for date ${date.toISOString()}: ${err.message}`
        );
        logger.debug(err.stack);
        throw err;
    }
};

module.exports = main;
