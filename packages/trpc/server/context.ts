import { getAuth } from "@repo/auth/express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export function createContext({ req }: CreateExpressContextOptions) {
  const { isAuthenticated, userId } = getAuth(req);
  console.log(req.headers.authorization);
console.log(userId);
  return {
    isAuthenticated,
    clerkId: userId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
