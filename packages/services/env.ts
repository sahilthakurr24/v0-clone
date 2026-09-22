import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().describe("Databse url"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().describe("Clerk publishable key"),
  CLERK_SECRET_KEY: z.string().describe("Clerk secret key"),
  GOOGLE_OAUTH_CLIENT_ID: z.string(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
