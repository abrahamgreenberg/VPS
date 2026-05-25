// Set every page in src/ to output as a flat .html file (e.g. about.html,
// article-1.html) rather than Eleventy's default pretty-URL directories.
// index.html is a special case: Eleventy gives it an empty fileSlug.
export default {
    permalink: function ({ page }) {
        const slug = page.fileSlug;
        return slug ? `${slug}.html` : "index.html";
    },
};
