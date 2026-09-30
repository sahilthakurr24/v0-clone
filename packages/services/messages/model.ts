import z from 'zod';


export const createMessageSchema = z.object({
    content : z.string().describe('Content of the message'),
    projectId : z.string().describe('Id of the project'),
});

export type CreateMessageSchemaType = z.infer<typeof createMessageSchema>;


export const getMessagesSchema = z.object({
    projectId : z.string().describe('Id of the project')
});

export type getMessagesSchemaType = z.infer<typeof getMessagesSchema>