import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import { clerkMiddleware } from "@repo/auth/express";
import {getAuth} from "@repo/auth/express"
import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";
import { inngest, serve } from "@repo/inngest";
import { functions } from "@repo/inngest/functions";

import { serverRouter, createContext } from "@repo/trpc/server";
import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Streamyst OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "trpc-accept"],
    }),
  );
}

app.use(express.json());

//inngest route
app.use("/api/inngest", serve({ client: inngest, functions }));
// clerk middleware
app.use(clerkMiddleware());

app.get('/get-user', (req, res)=>{
  const {userId} = getAuth(req);
  console.log("no tRpc:", userId);
  res.send({staus : 200, message : userId});
})

app.get("/", (req, res) => {
  return res.json({ message: "Streamyst is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Streamyst server is healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
