import dotenv from "dotenv";
import OpenAI from "openai";
// Import your logger
// const { createLogger } = require("../logger");
import { createLogger } from "../logger.js";

// Create a logger specific to this file
const logger = createLogger("openai");

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

const main = async (hebrew) => {
    logger.info("Starting Hebrew → English translation job");
    logger.debug(hebrew);
    // return;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant that translates Hebrew text to English. Respond only with JSON in the specified schema. Just output raw JSON with no code blocks",
                },
                {
                    role: "user",
                    content: `Translate the following Hebrew text to English, line by line with 3-6 words at a time, and return JSON array.:
// [{"hebrew":"...","english":"..."}]
// Hebrew text: "${JSON.stringify(hebrew)}."`,
                },
            ],
            reasoning_effort: "minimal",
        });

        const raw = response.choices[0].message.content;

        try {
            const parsed = JSON.parse(raw);
            console.log(parsed);
            logger.info(`Successfully parsed translation`);
            return parsed;
        } catch (error) {
            console.log(raw);
            console.error(error);
            logger.error(`Error parsing hebrew`);
            logger.error(error);
        }
    } catch (apiError) {
        logger.error("Open API Error");
        logger.error(apiError);
        console.error(apiError);
    }
};
export default main;

// const sentences = hebrew
//     .split(".")
//     .map((s) => s.trim())
//     .filter(Boolean);

// logger.debug(`Split text into ${sentences.length} sentences`);

// const finalResult = [];
// let attempts = 0;

// for (let i = 0; i < sentences.length; i++) {
//     const sentence = sentences[i];
// logger.info(`Processing sentence ${i + 1}/${sentences.length}`);
// logger.debug(`Sentence content: "${sentence}"`);

// try {

// finalResult.push(...parsed);
// logger.info(
// `Successfully parsed translation for sentence ${i + 1}: ${
// parsed.length
//                 } line(s)`
//             );
//             attempts = 0; // reset on success
//         } catch (parseErr) {
//             attempts++;
//             logger.warn(
//                 `Failed to parse JSON for sentence ${
//                     i + 1
//                 } (attempt ${attempts}): ${parseErr.message}`
//             );
//             logger.debug(`Raw response:\n${raw}`);
//             if (attempts >= 3) {
//                 logger.error(
//                     `Exceeded max retry attempts for sentence ${
//                         i + 1
//                     }, skipping.`
//                 );
//                 attempts = 0;
//             } else {
//                 // Retry same sentence again
//                 i--;
//                 continue;
//             }
//         }
//     } catch (apiErr) {
//         logger.error(
//             `OpenAI API error on sentence ${i + 1}: ${apiErr.message}`
//         );
//         logger.debug(apiErr.stack);
//     }
// }
// logger.info(
//     `Translation complete. Total output entries: ${finalResult.length}`
// );
// return finalResult;

// } catch (error) {}
