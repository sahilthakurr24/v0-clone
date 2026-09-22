import { httpBatchLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
  getToken?: () => Promise<string | null>;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpBatchLink;

  return c({
    url: env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc",
    headers: async () => {
      const token = (await opts?.getToken?.()) ?? null;

      if (!token) {
        return {};
      }

      return {
        authorization: `Bearer ${token}`,
      };
    },
    fetch: async (input, init) => {
      const token = (await opts?.getToken?.()) ?? null;
      const headers = new Headers(init?.headers ?? {});

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return fetch(input, {
        ...init,
        headers,
      });
    },
  });
};
