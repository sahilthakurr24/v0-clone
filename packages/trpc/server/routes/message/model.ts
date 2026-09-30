import z from "zod";

export const createMessageInputSchema = z.object({
  content: z.string().describe("Message content"),
  projectId: z.string().describe("Id of the project"),
});

export const createMessageOutputSchema = z.string().describe("Id of the created message");

export const getMessagesInputSchema = z.object({
  projectId: z.string().describe("Id of the project"),
});

export const getMessagesOutputSchema = z.array(
    z.object({
      message: z.object({
        id: z.string(),
        content: z.string(),
        role: z.enum(["USER", "ASSISTANT"]),
        type: z.enum(["RESULT", "ERROR"]),
        projectId: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
      fragment: z
        .object({
          id: z.string(),
          messageId: z.string(),
          sandboxUrl: z.string(),
          title: z.string(),
          files: z.unknown(),
          createdAt: z.date(),
          updatedAt: z.date(),
        })
        .nullable(),
    })
  );
