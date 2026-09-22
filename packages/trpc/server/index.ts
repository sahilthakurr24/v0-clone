import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { projectRouter } from "./routes/project";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  project: projectRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
