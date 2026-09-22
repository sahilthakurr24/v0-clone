import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
  getToken?: () => Promise<string | null>;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  console.log("🔥 TRPC CLIENT CREATED");
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
 
  return c({
    // Server-side fetch requires an absolute URL. The API runs on port 8000
    // locally; deployments should provide NEXT_PUBLIC_API_URL instead.
    url: env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc",
    headers: async () => {
      console.log("🔥 HEADERS FUNCTION CALLED");
      const token = (await opts?.getToken?.()) ?? null;
      console.log("🔥 TOKEN EXISTS:", !!token);
      if (!token) {
        return {};
      }

      return {
        authorization: `Bearer ${token}`,
      };
    },
  });
};
