import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import superjson from "superjson";
import { env } from "~/env.js";

export const createTRPCHttpBatchClientClient = (opts?: {
  enableStreaming?: boolean;
  getToken?: () => Promise<string | null>;
}) => {
  const c = opts?.enableStreaming
    ? httpBatchStreamLink
    : httpLink;

  return c({
    url: env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc",

    transformer: superjson,

    headers: async () => {
      const token = (await opts?.getToken?.()) ?? null;

      if (!token) return {};

      return {
        authorization: `Bearer ${token}`,
      };
    },
  });
};