import { z } from "zod";

export const DateSchema = z
    .string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, {
        message: "Date must be in dd-mm-yyyy format",
    })
    .transform((date) => {
        const [day, month, year] = date.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    })
    .refine((date) => !isNaN(date.getTime()), { message: "Invalid date" });

export const MonthYearSchema = z.string().regex(/^(0[1-9]|1[0-2])-\d{4}$/, {
    message: "Month must be in mm-yyyy format",
});

export const SyncRequestSchema = z.object({
    clientHalachot: z.array(z.tuple([z.number(), z.number()])),
});
