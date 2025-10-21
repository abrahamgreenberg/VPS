const cheerio = require("cheerio");
const axios = require("axios");

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
    // Remove disallowed tags but keep their contents
    $("*").each((_, el) => {
        const tag = el.tagName?.toLowerCase();
        if (!allowedTags.includes(tag)) $(el).replaceWith($(el).contents());
    });

    // Remove <script> tags
    $("script").remove();

    // Remove style, class, id attributes
    $("*").each((_, el) => {
        $(el).removeAttr("style").removeAttr("class").removeAttr("id");
    });

    // Replace YouTube <iframe> with <a>
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

    // Remove stray text nodes in <body>
    $("body")
        .contents()
        .each((_, el) => {
            if (el.type === "text" && $(el).text().trim() !== "") {
                $(el).remove();
            }
        });

    // Remove footnote links
    $('a[href*="ftn"]').remove();
}

// ============================
// EXTRACT CLEAN HTML
// ============================
const extractHtml = ($) => {
    $("br").remove();

    const innerBody = $("body").html()?.trim() || "";

    const cleanedInner = innerBody
        .replace(/^\s*[\r\n]/gm, "") // remove empty lines
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .trim();

    return `<div>${cleanedInner}</div>`;
};

// ============================
// EXTRACT TITLES & PARAGRAPHS
// ============================
const extractTitlesAndParagraphs = ($) => {
    // Hebrew titles (h3 > a)
    const titles = [];
    $("h3 > a").each((i, el) => {
        if (i < 2) {
            titles.push({
                text: $(el).text().trim(),
                url: $(el).attr("href"),
            });
        }
    });

    // First two paragraphs
    const paragraphs = [];
    $("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text && paragraphs.length < 2) {
            paragraphs.push(text);
        }
    });

    return { titles, paragraphs };
};

// ============================
// SCRAPE PENINEI HALACHA
// ============================
const scrapePeninei = async (url) => {
    console.log(url);
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    cleanDom($);

    const cleanedHtml = extractHtml($);
    const { titles, paragraphs } = extractTitlesAndParagraphs($);

    return { html: cleanedHtml, titles, paragraphs };
};

// ============================
// MAIN
// ============================
const main = async (date) => {
    const { titles, paragraphs } = await scrapePeninei(
        `https://ph.yhb.org.il/wp-content//plugins//db-connect//py0.php?date=${date.getTime()}`
    );

    // Combine the first two titles with corresponding paragraphs
    const halachas = titles.map((title, i) => ({
        title: title.text,
        url: title.url,
        text: (paragraphs[i] || "").replace(/\n/g, " "), // fallback if paragraph is missing
    }));

    return halachas;
};

module.exports = main;
