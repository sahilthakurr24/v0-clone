import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { projectRouter } from "./routes/project";
import { messageRouter } from "./routes/message";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  project: projectRouter,
  message: messageRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
