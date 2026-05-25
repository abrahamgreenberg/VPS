export default function (eleventyConfig) {
    // Copy static assets to output as-is
    eleventyConfig.addPassthroughCopy("css");
    eleventyConfig.addPassthroughCopy("js");
    eleventyConfig.addPassthroughCopy("assets");

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            data: "_data",
        },
        // Process .html files in src/ with Nunjucks so layouts and template
        // tags work, while preserving the existing .html output extensions.
        htmlTemplateEngine: "njk",
    };
}
