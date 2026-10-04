import { db, eq, asc } from "@repo/database";
import {
  createMessageSchema,
  CreateMessageSchemaType,
  getMessagesSchema,
  getMessagesSchemaType,
} from "./model";
import { fragments, messages } from "@repo/database/schema";
import { inngest } from "@repo/inngest";

class MessageService {
  //create message
  public async createMessage(payload: CreateMessageSchemaType) {
    const { content, projectId } = await createMessageSchema.parseAsync(payload);

    const [newMessage] = await db
      .insert(messages)
      .values({
        projectId,
        content,
        role: "USER",
        type: "RESULT",
      })
      .returning({ id: messages.id, content: messages.content });

    if (!newMessage?.id || !newMessage.content) throw new Error("Unable to create a mesage");

    //sending event to the inngest
    await inngest.send({
      name: "code-agent/run",
      data: {
        projectId,
        prompt: newMessage.content,
      },
    });

    return { id: newMessage.id };
  }

  public async getMessages(payload: getMessagesSchemaType) {
    const { projectId } = await getMessagesSchema.parseAsync(payload);

    const mess = await db
      .select({ message: messages, fragment: fragments })
      .from(messages)
      .where(eq(messages.projectId, projectId))
      .leftJoin(fragments, eq(fragments.messageId, messages.id))
      .orderBy(asc(messages.updatedAt));

    if (!mess) throw new Error("Unable to get the message");

    const formatedMess = mess.filter((row) => {
      if (row.fragment !== null) {
        return row;
      }
    });

    return { formatedMess };
  }
}

export default MessageService;
