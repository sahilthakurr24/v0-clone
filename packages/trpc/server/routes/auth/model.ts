import z, { ZodString } from "zod";

export const authOutputSchema = z.string().describe('Clerk id of the user');