import { openai } from "@inngest/agent-kit";
import { env } from "../env";

export const openaiModel = openai({
  model: env.OPENAI_MODEL,
  apiKey: env.OPENAI_API_KEY,
});


