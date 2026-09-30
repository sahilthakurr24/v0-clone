import { messageService } from "../../services";
import { authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createMessageInputSchema,
  createMessageOutputSchema,
  getMessagesInputSchema,
  getMessagesOutputSchema,
} from "./model";

const TAGS = ["MESSAGE"];
const getpath = generatePath("/message");

export const messageRouter = router({
  createMessage: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getpath("/create-message"), tags: TAGS } })
    .input(createMessageInputSchema)
    .output(createMessageOutputSchema)
    .mutation(async ({ input }) => {
      const { content, projectId } = input;
      const { id } = await messageService.createMessage({ content, projectId });
      return id;
    }),

  getMessages: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getpath("/get-messages"), tags: TAGS } })
    .input(getMessagesInputSchema)
    .output(getMessagesOutputSchema)
    .query(async ({ input }) => {
      const { projectId } = input;
      const { formatedMess } = await messageService.getMessages({ projectId });
      return formatedMess;
    }),
});
