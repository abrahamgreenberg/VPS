import dotenv from "dotenv";
import OpenAI from "openai";
// Import your logger
// const { createLogger } = require("../logger");
import { createLogger } from "../logger.js";

// Create a logger specific to this file
const logger = createLogger("openai");

const openai = new OpenAI({ apiKey: process.env.BACKEND_OPEN_API_KEY });

const main = async (halachaObj) => {
    logger.info("Starting Hebrew → English translation job");
    const maxAttempts = parseInt(process.env.BACKEND_AI_MAX_ATTEMPTS, 10) || 3;
    logger.debug(`Max attempts set to ${maxAttempts}`);
    let attempt = 0;
    let lastError = null;

    // Accept halachaObj: { heTitle, heText }
    const { heTitle, heText } = halachaObj;

    while (attempt < maxAttempts) {
        attempt++;
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert hebrew to english translator.
You translate religious texts with high accuracy and attention to detail, translating nuances and context effectively.
For example references to Jewish law -> Halacha, God -> Hashem, etc.
Make sure to preserve punctuation (such as full stops and commas).
Respond only with JSON in the specified schema. Just output raw JSON with no code blocks. Ensure the JSON is valid.`,
                    },
                    {
                        role: "user",
                        content: `Translate the following Hebrew halacha. Return JSON in the following schema:
{
  "enTitle": "<English translation of the title>",
  "lines": [{"hebrew":"...","english":"..."}]
}
Title: ${JSON.stringify(heTitle)}
Text: ${JSON.stringify(heText)}
Translate the title to English as 'enTitle', and translate the text phrase by phrase (a few words that would be readable as a short phrase) as 'lines'. In the hebrew field, include just the words you translated in that line.`,
                    },
                ],
                reasoning_effort: "minimal",
            });

            const raw = response.choices[0].message.content;

            try {
                const parsed = JSON.parse(raw);
                logger.info(
                    `Successfully parsed translation (attempt ${attempt})`
                );
                // Expecting { enTitle, lines }
                return parsed;
            } catch (error) {
                logger.error(`Error parsing translation (attempt ${attempt})`);
                logger.error(error);
                lastError = error;
            }
        } catch (apiError) {
            logger.error(`Open API Error (attempt ${attempt})`);
            logger.error(apiError);
            lastError = apiError;
        }
    }

    logger.error(`Failed to parse translation after ${maxAttempts} attempts`);
    if (lastError) logger.error(lastError);
    return null;
};

export default main;
