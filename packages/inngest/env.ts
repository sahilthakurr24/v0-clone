import z from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().describe("Openai api key"),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
