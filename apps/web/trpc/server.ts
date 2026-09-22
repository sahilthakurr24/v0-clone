import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient } from "@repo/trpc/client";
import { auth } from "@repo/auth/nextjs";
import { createTRPCHttpBatchClientClient } from "~/trpc/create-client";

const getToken = async () => {
  const { getToken: getClerkToken } = await auth();
  const token = await getClerkToken();
  console.log("TOKEN FROM AUTH:", !!token);
  return token;
};

export const api = createTRPCProxyClient<ServerRouter>({
  links: [createTRPCHttpBatchClientClient({ getToken })],
});

export const apiStreaming = createTRPCProxyClient<ServerRouter>({
  links: [createTRPCHttpBatchClientClient({ enableStreaming: true, getToken })],
});
