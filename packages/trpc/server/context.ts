import { getAuth } from "@repo/auth/express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export function createContext({ req }: CreateExpressContextOptions) {
  const { isAuthenticated, userId } = getAuth(req);
  return {
    isAuthenticated,
    clerkId: userId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
