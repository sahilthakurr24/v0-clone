import { inngest } from "../index";
import { Sandbox } from "@repo/sandbox";
import { asc, db, desc, eq } from "@repo/database";
import { fragments, messages } from "@repo/database/schema";
import { createAgent, createNetwork, createState, createTool } from "@inngest/agent-kit";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "../prompt";
import { openaiModel } from "../agent/model";
import z from "zod";
import { agentOutputText, lastAssistantTextMessageContent } from "../utils";

const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 18_000;
// The generated Next.js app is installed at /home/user by the sandbox template.
// Prune tool/runtime caches before descending so they cannot enter agent context.
const SANDBOX_PROJECT_ROOT = "/home/user";
const SANDBOX_PROJECT_FILES_COMMAND =
  `find ${SANDBOX_PROJECT_ROOT} -maxdepth 6 \\( -type d \\( -name .bun -o -name node_modules -o -name .next -o -name .git -o -name .turbo -o -name .cache -o -name coverage -o -name dist -o -name build -o -name out \\) -prune \\) -o \\( -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.css' -o -name '*.scss' -o -name '*.html' -o -name '*.md' -o -name '*.mdx' -o -name '*.json' -o -name '*.jsonc' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.svg' -o -name '*.txt' -o -name '*.env*' -o -name '*.config.*' -o -name '.gitignore' -o -name '.npmrc' -o -name '.prettierignore' -o -name '.prettierrc*' \\) -print \\) | sort | head -200`;

function boundedHistory(
  rows: Array<{ id: string; role: string; type: string; content: string }>,
  currentMessageId: string | undefined,
  currentPrompt: string,
) {
  let currentId = currentMessageId;
  if (!currentId) {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (rows[index]?.role === "USER" && rows[index]?.content === currentPrompt) {
        currentId = rows[index]?.id;
        break;
      }
    }
  }

  const prior = rows.filter((message) => message.id !== currentId && message.type !== "ERROR");
  const selected: Array<{ type: "text"; role: "user" | "assistant"; content: string }> = [];
  let totalChars = 0;
  for (let index = prior.length - 1; index >= 0 && selected.length < MAX_HISTORY_MESSAGES; index -= 1) {
    const message = prior[index];
    if (!message || totalChars >= MAX_HISTORY_CHARS) break;
    const remaining = MAX_HISTORY_CHARS - totalChars;
    const content = message.content.length > remaining
      ? `[Earlier context trimmed]\n${message.content.slice(-Math.max(0, remaining - 27))}`
      : message.content;
    selected.unshift({
      type: "text",
      role: message.role.toLowerCase() as "user" | "assistant",
      content,
    });
    totalChars += content.length;
  }
  return selected;
}

function sandboxPath(input: string) {
  const path = input.trim().replace(/^@\//, "").replace(/^\/home\/user\/?/, "").replace(/^\.\//, "");
  const segments = path.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Invalid sandbox file path: ${input}`);
  }
  return `/home/user/${segments.join("/")}`;
}

async function readSandboxFiles(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  const result = await sandbox.commands.run(SANDBOX_PROJECT_FILES_COMMAND);
  const files: Record<string, string> = {};
  let totalChars = 0;
  for (const absolutePath of result.stdout.split("\n").filter(Boolean)) {
    if (totalChars >= 500_000) break;
    try {
      const content = await sandbox.files.read(absolutePath);
      if (totalChars + content.length > 500_000) continue;
      files[absolutePath.replace(/^\/home\/user\//, "")] = content;
      totalChars += content.length;
    } catch (error) {
      console.warn("Unable to capture sandbox file", absolutePath, error);
    }
  }
  return files;
}

export interface CodeAgentState {
  sandboxId: string;
  summary: string;
  files: Record<string, string>;
  baselineFiles: Record<string, string>;
  changedFileCount: number;
  fileWriteCalls: number;
  fileWriteCallsAtCheck: number;
  websiteCheckDone: boolean;
  websiteCheckSuccess: boolean;
  websiteCheckAttempts: number;
  websiteCheckError: string;
  noWriteRetries: number;
  requireFileWrite: boolean;
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

      return boundedHistory(prevMessages, event.data.messageId, event.data.prompt);
    });

    const existingFiles = await step.run("get-existing-files", async () => {
      const [fragment] = await db
        .select({ files: fragments.files })
        .from(messages)
        .innerJoin(fragments, eq(messages.id, fragments.messageId))
        .where(eq(messages.projectId, event.data.projectId))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      const value = fragment?.files;
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandboxId);
      return `https://${sandbox.getHost(3000)}`;
    });

    const baselineFiles = await step.run("read-initial-sandbox-files", () => readSandboxFiles(sandboxId));

    const state = createState<CodeAgentState>(
      {
        sandboxId,
        summary: "",
        files: existingFiles,
        baselineFiles,
        changedFileCount: 0,
        fileWriteCalls: 0,
        fileWriteCallsAtCheck: 0,
        websiteCheckDone: false,
        websiteCheckSuccess: false,
        websiteCheckAttempts: 0,
        websiteCheckError: "",
        noWriteRetries: 0,
        requireFileWrite: false,
      },
      { messages: previousMessages },
    );

    const websiteChecker = createTool({
      name: "websiteChecker",
      description: "Check whether the supplied sandbox preview URL responds successfully and contains no Next.js runtime error. Return the HTTP status and any actionable error text.",
      parameters: z.object({ url: z.string() }),
      handler: async ({ url }, { network }) => {
        let result: { success: true; status: number } | { success: false; status?: number; error: string };
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
          const html = await response.text();
          const runtimeError = html.match(/data-next-error-message=["']([^"']*)["']/)?.[1]
            || html.match(/data-next-error-stack=["']([^"']*)["']/)?.[1];
          result = !response.ok || runtimeError
            ? { success: false, status: response.status, error: runtimeError || `HTTP ${response.status}` }
            : { success: true, status: response.status };
        } catch (error) {
          result = { success: false, error: error instanceof Error ? error.message : String(error) };
        }

        network.state.data.websiteCheckDone = true;
        network.state.data.websiteCheckSuccess = result.success;
        network.state.data.websiteCheckAttempts += 1;
        network.state.data.websiteCheckError = result.success ? "" : result.error;
        return result;
      },
    });

    let fileWriteCall = 0;
    let fileReadCall = 0;
    const codeAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent",
      system: ({ network }) => {
        const checkError = network?.state.data.websiteCheckError;
        return checkError
          ? `${PROMPT}\n\nThe preview check failed. Fix this specific runtime problem before returning a task summary:\n${checkError}`
          : PROMPT;
      },
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
          description: "Required for every code change: create or replace the complete contents of each changed project file. Returns success only after reading the written contents back from the sandbox. Never claim a change is complete without this confirmed result.",
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
            console.info("code-agent createOrUpdateFiles", {
              projectId: event.data.projectId,
              paths: files.map((file) => file.path),
            });
            const callId = ++fileWriteCall;
            try {
              const newFiles = await step?.run(`create-or-update-files-${callId}`, async () => {
                const updatedFiles = { ...(network.state.data.files || {}) };
                let changedFileCount = network.state.data.changedFileCount;
                const sandbox = await Sandbox.connect(sandboxId);

                for (const file of files) {
                  const path = sandboxPath(file.path);
                  await sandbox.files.write(path, file.content);
                  const writtenContent = await sandbox.files.read(path);
                  if (writtenContent !== file.content) {
                    throw new Error(`Read-back verification failed for ${path}`);
                  }
                  updatedFiles[path.replace(/^\/home\/user\//, "")] = writtenContent;
                  if (network.state.data.baselineFiles[path.replace(/^\/home\/user\//, "")] !== writtenContent) {
                    changedFileCount += 1;
                  }
                }

                return { files: updatedFiles, changedFileCount };
              });
              if (newFiles && typeof newFiles === "object" && "files" in newFiles) {
                network.state.data.files = newFiles.files;
                network.state.data.changedFileCount = newFiles.changedFileCount;
                network.state.data.fileWriteCalls += 1;
                if (newFiles.changedFileCount > 0) network.state.data.noWriteRetries = 0;
                return `Verified ${files.length} file write(s): ${files.map((file) => sandboxPath(file.path)).join(", ")}. ${newFiles.changedFileCount} file(s) differ from the starting project.`;
              }
              return "File writes were not verified. Do not claim the requested change is complete.";
            } catch (error) {
              return `FILE_WRITE_FAILED: ${error instanceof Error ? error.message : String(error)}. Do not claim completion; inspect the path and retry.`;
            }
          },
        }),

        // readfiles from sandbox
        createTool({
          name: "readFiles",
          description: "Read existing project files. Accepts paths from listFiles, relative paths, or @/ import paths.",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step, network }) => {
            const callId = ++fileReadCall;
            return await step?.run(`read-files-${callId}`, async () => {
              try {
                const sandbox = await Sandbox.connect(sandboxId);
                let contents: Array<any> = [];
                for (const file of files) {
                  const path = sandboxPath(file);
                  const content = await sandbox.files.read(path);
                  contents.push({ path, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return "Error" + error;
              }
            });
          },
        }),
        createTool({
          name: "listFiles",
          description: "List real files in the sandbox project before reading or editing unfamiliar code.",
          parameters: z.object({}),
          handler: async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            const result = await sandbox.commands.run(
              SANDBOX_PROJECT_FILES_COMMAND,
            );
            return result.stdout;
          },
        }),
      ],
      lifecycle: {
        onStart: async ({ prompt, history, network }) => {
          const additions = [];
          if (network?.state.data.requireFileWrite) {
            additions.push({
              type: "text" as const,
              role: "user" as const,
              content: "Your previous response was not confirmed as a project change. Inspect the actual files, implement the requested change, and call createOrUpdateFiles with changed content. Do not claim completion without a confirmed write.",
            });
          }
          if (network?.state.data.websiteCheckError) {
            additions.push({
              type: "text" as const,
              role: "user" as const,
              content: `The preview is still failing. Fix this checker error and update the files: ${network.state.data.websiteCheckError}`,
            });
          }
          return { prompt: additions.length ? [...prompt, ...additions] : prompt, history: history ?? [], stop: false };
        },
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText = lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
        onFinish: async ({ result, network }) => {
          if (network && !network.state.data.summary) {
            network.state.data.summary =
              lastAssistantTextMessageContent(result) || `<task_summary>\n${event.data.prompt}\n</task_summary>`;
          }
          return result;
        },
      },
    });

    const websiteVerificationAgent = createAgent({
      name: "website-verification-agent",
      description: "Checks whether the sandbox website is running",
      system: `Check whether the website is running by calling websiteChecker with this URL: ${sandboxUrl}. Do not edit files. Report the result and any error briefly.`,
      model: openaiModel,
      tools: [websiteChecker],
      tool_choice: "websiteChecker",
      lifecycle: {
        onStart: async ({ prompt, history, network }) => ({
          prompt,
          history: history ?? [],
          stop: network?.state.data.websiteCheckDone ?? false,
        }),
      },
    });

    const network = createNetwork({
      name: "code-agent-network",
      agents: [codeAgent, websiteVerificationAgent],
      maxIter: 15,
      //router is a check which runs after every single iteration
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (!summary) {
          return codeAgent;
        }

        if (network.state.data.changedFileCount === 0) {
          
          network.state.data.noWriteRetries += 1;
          network.state.data.requireFileWrite = true;
          network.state.data.summary = "";
          return codeAgent;
        }

        if (network.state.data.websiteCheckDone) {
          if (network.state.data.websiteCheckSuccess) return;
          network.state.data.fileWriteCallsAtCheck = network.state.data.fileWriteCalls;
          network.state.data.websiteCheckDone = false;
          network.state.data.summary = "";
          network.state.data.requireFileWrite = true;
          return codeAgent;
        }

        if (
          network.state.data.websiteCheckAttempts > 0
          && network.state.data.fileWriteCalls === network.state.data.fileWriteCallsAtCheck
        ) return;
        return websiteVerificationAgent;
      },
    });

    let result;
    try {
      result = await network.run(event.data.prompt, { state });
    } catch (error) {
      console.error("Code agent run failed", {
        projectId: event.data.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      await step.run("save-agent-error", async () =>
        db.insert(messages).values({
          projectId: event.data.projectId,
          content: "I couldn't finish that update. Your existing preview is still available; try a smaller change.",
          role: "ASSISTANT",
          type: "ERROR",
        }),
      );
      return { url: sandboxUrl, error: true };
    }

    const { summary } = result.state.data;
    const sandboxFiles = await step.run("read-final-sandbox-files", () => readSandboxFiles(sandboxId));
    const trackedFiles = result.state.data.files || {};
    const files = { ...sandboxFiles, ...trackedFiles };
    result.state.data.files = files;
    const changedFiles = result.state.data.changedFileCount > 0;

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

    const summaryForResponse = summary || `<task_summary>\n${event.data.prompt}\n</task_summary>`;
    const [{ output: fragmentTitleOutput }, { output: responseOutput }] = await Promise.all([
      fragmentTitleGenerator.run(summaryForResponse, { step }),
      responseGenerator.run(summaryForResponse, { step }),
    ]);

    const fragmentTitle = agentOutputText(fragmentTitleOutput, "untitled");
    const generatedResponse = agentOutputText(responseOutput, "Here you go");
    const responseText = result.state.data.websiteCheckSuccess
      ? generatedResponse
      : `${generatedResponse}\n\nThe preview is still not running: ${result.state.data.websiteCheckError || "the checker did not pass before the iteration limit."}`;

    console.log(files);

    const isError = !changedFiles;

    await step.run("save-result", async () => {
      if (isError) {
        return await db.insert(messages).values({
          projectId: event.data.projectId,
          content: "The AI did not make a verified change to the project files. Your existing preview is unchanged.",
          role: "ASSISTANT",
          type: "ERROR",
        });
      }

      return await db.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({
            projectId: event.data.projectId,
            content: summary ? responseText : "The project files were updated, but the AI did not return a completion summary.",
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
