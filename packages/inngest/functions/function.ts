import { inngest } from "../index";
import { Sandbox } from "@repo/sandbox";
import { asc, db, desc, eq } from "@repo/database";
import { fragments, messages } from "@repo/database/schema";
import { createAgent, createNetwork, createState, createTool } from "@inngest/agent-kit";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "../prompt";
import { openaiModel } from "../agent/model";
import z from "zod";
import { agentOutputText, lastAssistantTextMessageContent } from "../utils";

export interface CodeAgentState {
  sandboxId: string;
  summary: string;
  files: Record<string, string>;
}

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      return { processed: true, id: event.data.id };
    });

    await step.sleep("pause", "1s");

    return { message: `Task ${event.data.id} complete`, result };
  },
);

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    triggers: { event: "code-agent/run" },
  },
  async ({ event, step }) => {
    //step1
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const previousMessage = await db
        .select({
          sandboxId: fragments.sandboxId,
        })
        .from(messages)
        .innerJoin(fragments, eq(messages.id, fragments.messageId))
        .where(eq(messages.projectId, event.data.projectId))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (previousMessage[0]?.sandboxId) {
        return previousMessage[0].sandboxId;
      }

      const sandbox = await Sandbox.create({
        template: "52sqtnv3xxthx7pozcv4",
        timeoutMs: 30 * 60 * 1000,
      });

      return sandbox.sandboxId;
    });
    //step2
    const previousMessages = await step.run("get-prev-message", async () => {
      const prevMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.projectId, event.data.projectId))
        .orderBy(asc(messages.createdAt));

      return prevMessages?.map((message) => ({
        type: "text" as const,
        role: message.role.toLowerCase() as "user" | "assistant",
        content: message.content,
      }));
    });

    const state = createState<CodeAgentState>(
      { sandboxId, summary: "", files: {} },
      { messages: previousMessages },
    );

    const codeAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: openaiModel,
      tools: [
        //terminal tool (providing terminal to ai to run the commands)
        createTool({
          name: "terminal",
          description: "Use the terminal to run the commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step, network }) => {
            const buffers = { stdout: "", stderr: "" };

            try {
              const sandbox = await Sandbox.connect(sandboxId);

              const result = await sandbox.commands.run(command, {
                onStdout: (data) => {
                  buffers.stdout += data;
                },
                onStderr: (data) => {
                  buffers.stderr += data;
                },
              });

              return result.stdout;
            } catch (error) {
              return `Command failed: ${error} \n stdout: ${buffers.stdout}\n stderr: ${buffers.stderr}`;
            }
          },
        }),

        //create files and update files in the sandbox
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z
                  .string()
                  .describe("path of the relative file for example -> app.tsx, index.ts"),
                content: z.string().describe("content of the  files"),
              }),
            ),
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await Sandbox.connect(sandboxId);

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                return "Error" + error;
              }
            });
            // adding the files in state
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),

        // readfiles from sandbox
        createTool({
          name: "readFiles",
          description: "Read files in the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step, network }) => {
            return await step?.run("read-files", async () => {
              try {
                const sandbox = await Sandbox.connect(sandboxId);
                let contents: Array<any> = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return "Error" + error;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText = lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      //router is a check which runs after every single iteration
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        //if we get the summary then return otherwise rerun the loop
        if (summary) {
          return;
        }
        return codeAgent;
      },
    });

    const result = await network.run(event.data.prompt, { state });

    const { summary, files } = result.state.data;

    //create an agent to generate the name for the fragment
    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: openaiModel,
    });

    const responseGenerator = createAgent({
      name: "response-generator",
      system: RESPONSE_PROMPT,
      model: openaiModel,
    });

    const [{ output: fragmentTitleOutput }, { output: responseOutput }] = await Promise.all([
      fragmentTitleGenerator.run(summary, { step }),
      responseGenerator.run(summary, { step }),
    ]);

    const fragmentTitle = agentOutputText(fragmentTitleOutput, "untitled");
    const responseText = agentOutputText(responseOutput, "Here you go");

    console.log(files);

    const isError =
      !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        console.log("alive");
        return `https://${sandbox.getHost(3000)}`;
      } catch (e) {
        console.log("dead:", e);
        return `Sandbox url not available`;
      }
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await db.insert(messages).values({
          projectId: event.data.projectId,
          content: "Something went wrong. Please try again",
          role: "ASSISTANT",
          type: "ERROR",
        });
      }

      return await db.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({
            projectId: event.data.projectId,
            content: responseText,
            role: "ASSISTANT",
            type: "RESULT",
          })
          .returning({ id: messages.id });

        if (!message) return;

        await tx.insert(fragments).values({
          sandboxId: sandboxId,
          sandboxUrl,
          title: fragmentTitle,
          files,
          messageId: message?.id,
        });
        return message.id;
      });
    });

    return { url: sandboxUrl, fragmentTitle, files, summary };
  },
);
