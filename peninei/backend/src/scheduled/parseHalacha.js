import { ai } from "../lib/index.js";
import { PrismaClient } from "@prisma/client";
import { createLogger } from "../logger.js";

const logger = createLogger("parser");
const prisma = new PrismaClient();

const BACKEND_PROCESS_WITH_AI = process.env.BACKEND_PROCESS_WITH_AI === "true";

export const parse_halachot_with_ai = async () => {
    if (!BACKEND_PROCESS_WITH_AI)
        logger.warn(
            "AI processing is disabled (BACKEND_PROCESS_WITH_AI=false)"
        );
    logger.info("Starting AI parsing job");

    try {
        // Find halachot that need AI parsing
        const halachotToParse = await prisma.halacha.findMany({
            where: {
                parseWithAi: true,
            },
            include: {
                lines: true,
            },
        });

        logger.info(
            `Found ${halachotToParse.length} halachot to parse with AI`
        );

        for (const halacha of halachotToParse) {
            try {
                logger.info(
                    `Processing AI translation for: "${halacha.heTitle}"`
                );

                // Delete existing translation lines if any
                if (halacha.lines.length > 0) {
                    await prisma.halachaLine.deleteMany({
                        where: { halachaId: halacha.id },
                    });
                    logger.debug(
                        `Deleted ${halacha.lines.length} existing translation lines`
                    );
                }

                // Process with AI
                const aiResult = await ai({
                    heTitle: halacha.heTitle,
                    heText: halacha.heText,
                });

                logger.debug("---- TRANSLATION ---- ");
                logger.debug(aiResult);

                if (!aiResult) {
                    logger.warn(
                        `AI translation failed for halacha: "${halacha.heTitle}"`
                    );
                    continue;
                }

                // Update halacha with English title
                await prisma.halacha.update({
                    where: { id: halacha.id },
                    data: {
                        enTitle: aiResult.enTitle,
                        parseWithAi: false,
                        version: halacha.version + 1,
                    },
                });

                // Create new translation lines
                if (aiResult.lines && aiResult.lines.length > 0) {
                    await prisma.halachaLine.createMany({
                        data: aiResult.lines.map((t) => ({
                            ...t,
                            halachaId: halacha.id,
                        })),
                    });

                    logger.info(
                        `Saved ${aiResult.lines.length} translation lines for: "${halacha.heTitle}"`
                    );
                }
            } catch (err) {
                logger.error(
                    `Failed AI processing for halacha "${halacha.heTitle}": ${err.message}`
                );
                logger.error(err);
            }
        }

        logger.info("AI parsing job completed");
    } catch (err) {
        logger.error(`AI parsing job failed: ${err.message}`);
        logger.error(err);
    }
};
