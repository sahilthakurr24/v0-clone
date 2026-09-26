import z from "zod";
import { TypeOf } from "zod/v3";

export const messageRoleEnum = z.enum(["USER", "ASSISTANT"]);
export const messageTypeEnum = z.enum(["RESULT", "ERROR"]);

const messageSchema = z.object({
  content: z.string().describe("Content of the message"),
});

export const createProjectSchema = z.object({
  clerkId: z.string().describe("ClerkId  of the user"),
  message: messageSchema.describe("message of the user"),
});

export type CreateProjectSchemaType = z.infer<typeof createProjectSchema>;

export const getProjectByIdSchema = z.object({
  projectId: z.string().describe("Id of the project"),
  clerkId: z.string().describe("ClerkId of the user"),
});

export type GetProjectByIdSchemaType = z.infer<typeof getProjectByIdSchema>;

export const getAllProjectSchema = z.object({
  clerkId: z.string().describe("ClerkId of the user"),
});

export type GetAllProjectsSchemaType = z.infer<typeof getAllProjectSchema>;