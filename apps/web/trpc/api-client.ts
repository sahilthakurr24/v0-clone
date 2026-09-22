"use client";
import { useMemo } from "react";
import { useAuth } from "@repo/auth/provider";
import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient } from "@repo/trpc/client";
import { createTRPCHttpBatchClientClient } from "~/trpc/create-client";

export function useApi(opts?: { streaming?: boolean }) {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createTRPCProxyClient<ServerRouter>({
        links: [
          createTRPCHttpBatchClientClient({
            enableStreaming: opts?.streaming,
            getToken,
          }),
        ],
      }),
    [getToken, opts?.streaming],
  );
}