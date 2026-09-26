import z from "zod";

const messageSchema = z.object({
  content: z.string().describe("Content of the message"),
});

export const createProjectInputSchema = z.object({
  message: messageSchema.describe("Message of the user"),
});

export const createProjectOutputSchema = z.object({
  projectId: z.string().describe("Message id of the created project"),
});

export const getProjectByIdInputSchema = z.object({
  projectId: z.string().describe("Id of the project"),
});

export const getProjectByIdOutputSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      role: z.enum(["USER", "ASSISTANT"]),
      type: z.enum(["RESULT", "ERROR"]),
      projectId: z.string(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),

  id: z.string().optional(),
  name: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
 
 export const getProjectsOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    userId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),

    messages: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        role: z.enum(["USER", "ASSISTANT"]),
        type: z.enum(["RESULT", "ERROR"]),
        projectId: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    ),
  }),
);
