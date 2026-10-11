"use client";

import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCreateMessage } from "@/hooks/api/message";
import { cn } from "@/lib/utils";

/** Maximum allowed length for a single message. */
const MAX_LENGTH = 1000;

/**
 * Auto-growing composer for sending a new message to a project.
 *
 * Validates that the message is non-empty and within {@link MAX_LENGTH}, j
 * sends it, clears the field on success, and reports outcomes via toasts.
 * Cmd/Ctrl+Enter submits.
 *
 * @param projectId - The project the message is sent to.
 */
export default function MessageForm({
  projectId,
  isGenerating = false,
}: {
  projectId: string;
  isGenerating?: boolean;
}) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { createMessageAsync, isPending } = useCreateMessage();

  /**
   * Validate and send the current message, then reset the input on success.
   */
  async function onSubmit() {
    const trimmed = content.trim();

    if (!trimmed) {
      toast.error("Message description is required");
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      toast.error("Description is too long");
      return;
    }

    try {
      await createMessageAsync({ projectId, content: trimmed });
      setContent("");
      toast.success("Message sent successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className={cn(
        "relative rounded-lg border bg-background p-3 transition-all",
        isFocused && "ring-2 ring-ring/20",
      )}
    >
      <TextareaAutosize
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={isPending || isGenerating}
        placeholder={
          isGenerating ? "The agent is working..." : "Ask for a change or describe what to build..."
        }
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        minRows={3}
        maxRows={8}
        className={cn(
          "w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/80",
          (isPending || isGenerating) && "opacity-50",
        )}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void onSubmit();
          }
        }}
      />

      <div className="flex items-end justify-between gap-x-2 pt-2">
        <div className="font-mono text-[10px] text-muted-foreground">
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span>&#8984;</span>Enter
          </kbd>
          &nbsp; to submit
        </div>
        <Button
          className="size-8 rounded-md"
          disabled={isPending || isGenerating || !content.trim()}
          type="submit"
        >
          {isPending || isGenerating ? <Spinner /> : <ArrowUpIcon className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
