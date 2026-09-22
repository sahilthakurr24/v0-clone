import { z, zodUndefinedModel } from "../../schema";
// import { userService } from "../../services";
import { getAuthenticationMethodOutputSchema } from "@repo/services/user/model";
import { authenticatedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { authOutputSchema } from "./model";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  getSupportedAuthenticationProviders: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/get-clerkId"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(authOutputSchema)
    .query(async ({ ctx }) => {
      return ctx.clerkId;
    }),
});
