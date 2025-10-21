const dotenv = require("dotenv");
const OpenAI = require("openai");

// Import your logger
const { createLogger } = require("../utils/logger");

// Create a logger specific to this file
const logger = createLogger(__filename);

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

/**
 * Translates Hebrew text into English sentence-by-sentence using the OpenAI API.
 * @param {string} hebrew - The Hebrew text to translate.
 * @returns {Promise<Array<{hebrew: string, english: string}>>}
 */
const main = async (hebrew) => {
    logger.info("Starting Hebrew → English translation job");

    const sentences = hebrew
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);

    logger.debug(`Split text into ${sentences.length} sentences`);

    const finalResult = [];
    let attempts = 0;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        logger.info(`Processing sentence ${i + 1}/${sentences.length}`);
        logger.debug(`Sentence content: "${sentence}"`);

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a helpful assistant that translates Hebrew text to English. Respond only with JSON in the specified schema. Just output raw JSON with no code blocks",
                    },
                    {
                        role: "user",
                        content: `Translate the following Hebrew text to English, line by line with 3-6 words at a time, and return JSON array.:
[{"hebrew":"...","english":"..."}]
Hebrew text: "${sentence}."`,
                    },
                ],
                temperature: 0,
            });

            const raw = response.choices[0].message.content;

            try {
                const parsed = JSON.parse(raw);
                finalResult.push(...parsed);
                logger.info(
                    `Successfully parsed translation for sentence ${i + 1}: ${
                        parsed.length
                    } line(s)`
                );
                attempts = 0; // reset on success
            } catch (parseErr) {
                attempts++;
                logger.warn(
                    `Failed to parse JSON for sentence ${
                        i + 1
                    } (attempt ${attempts}): ${parseErr.message}`
                );
                logger.debug(`Raw response:\n${raw}`);

                if (attempts >= 3) {
                    logger.error(
                        `Exceeded max retry attempts for sentence ${
                            i + 1
                        }, skipping.`
                    );
                    attempts = 0;
                } else {
                    // Retry same sentence again
                    i--;
                    continue;
                }
            }
        } catch (apiErr) {
            logger.error(
                `OpenAI API error on sentence ${i + 1}: ${apiErr.message}`
            );
            logger.debug(apiErr.stack);
        }
    }

    logger.info(
        `Translation complete. Total output entries: ${finalResult.length}`
    );
    return finalResult;
};

module.exports = main;
