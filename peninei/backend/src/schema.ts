import { z } from "zod";

export const DateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: "Date must be in yyyy-mm-dd format",
    })
    .transform((date) => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    })
    .refine((date) => !isNaN(date.getTime()), { message: "Invalid date" });

export const MonthYearSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    error: "Month must be in yyyy-mm format",
});

export const SyncRequestSchema = z
    .object({
        clientHalachot: z.array(z.tuple([z.number(), z.number()])),
    })
    .refine((data) => Array.isArray(data.clientHalachot), {
        error: "clientHalachot must be an array",
    });
