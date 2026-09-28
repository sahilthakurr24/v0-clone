import { openai } from "@inngest/agent-kit";
import { env } from "../env";

export const openaiModel = openai({
  model: "gpt-4o-mini",
  apiKey: env.OPENAI_API_KEY,
  defaultParameters: {
    temperature: 0,
  },
});


