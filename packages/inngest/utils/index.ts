import type { AgentResult } from "@inngest/agent-kit";

function textFromMessage(message: AgentResult["output"][number]): string | undefined {
  if (message.type !== "text") {
    return undefined;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : (part.text ?? "")))
      .join("");
  }

  return message.content;
}

/** Plain text from agent output, with a fallback when nothing is found. */
export function agentOutputText(output: AgentResult["output"], fallback: string): string {
  return lastAssistantTextMessageContent({ output } as AgentResult) ?? fallback;
}

/** Save `<task_summary>` from the agent's latest reply into network state. */
export function captureTaskSummary(
  result: AgentResult,
  network?: { state: { data: { summary?: string } } },
) {
  const text = lastAssistantTextMessageContent(result);
  if (text?.includes("<task_summary>") && network) {
    network.state.data.summary = text;
  }
}

/**
 * Extract the text of the most recent assistant message from an agent result.
 */
export function lastAssistantTextMessageContent(result: any) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message: any) => message.role === "assistant",
  );

  const message = result.output[lastAssistantTextMessageIndex];

  return message?.content
    ? typeof message.content === "string"
      ? message.content
      : message.content.map((c: any) => c.text).join("")
    : undefined;
}
