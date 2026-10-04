"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { parseFragmentFiles, type ProjectFragment } from "@/features/lib/fragment-types";
import { useGetMessages } from "@/hooks/api/message";

import MessageCard from "./message-card";
import MessageForm from "./message-form";
import MessageLoading from "./message-loader";
import { trpc } from "@/trpc/client";

type MessageItem = NonNullable<ReturnType<typeof useGetMessages>["data"]>[number];
type RawFragment = NonNullable<MessageItem["fragment"]>;

/** Converts a raw DB fragment into the shape the preview/code viewer expects. */
function toActiveFragment(fragment: RawFragment | null | undefined): ProjectFragment | null {
  if (!fragment) return null;
  return {
    ...fragment,
    files: parseFragmentFiles(fragment.files),
  } as ProjectFragment;
}

/**
 * Scrollable list of a project's messages plus the composer.
 *
 * Loads (and polls) messages, prefetches them on mount, auto-selects the latest
 * assistant fragment, keeps the active fragment in sync when its files change,
 * auto-scrolls to the newest message, and shows a loading indicator while the
 * assistant is responding to the last user message. Handles loading, error,
 * and empty states.
 *
 * @param projectId - The project whose conversation is shown.
 * @param activeFragment - The currently selected fragment (for preview/code).
 * @param setActiveFragment - Setter to change the active fragment.
 */
export default function MessageContainer({
  projectId,
  activeFragment,
  setActiveFragment,
}: {
  projectId: string;
  activeFragment: ProjectFragment | null;
  setActiveFragment: (fragment: ProjectFragment | null) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const utils = trpc.useUtils();

  const { data: messages, isPending, isError, error } = useGetMessages({ projectId });

  useEffect(() => {
    if (projectId) {
      void utils.message.getMessages.prefetch({ projectId });
    }
  }, [projectId, utils]);

  // Reset the "last seen" marker when switching projects
  useEffect(() => {
    lastAssistantMessageIdRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!messages) return;

    // Each item is shaped { message, fragment }
    const latest = messages.findLast((m) => m.message.role === "ASSISTANT" && m.fragment);

    // 1. New assistant message with a fragment -> select it
    if (latest?.fragment && latest.message.id !== lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latest.message.id;
      setActiveFragment(toActiveFragment(latest.fragment));
      return;
    }

    // 2. Active fragment still exists but its data changed -> refresh it
    if (activeFragment) {
      const fresh = messages.find((m) => m.fragment?.id === activeFragment.id)?.fragment;

      if (
        fresh &&
        JSON.stringify(parseFragmentFiles(fresh.files)) !== JSON.stringify(activeFragment.files)
      ) {
        setActiveFragment(toActiveFragment(fresh));
      }
    }
  }, [messages, activeFragment, setActiveFragment]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Error: {error?.message || "Failed to load messages"}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          No messages yet. Start a conversation!
        </div>
        <div className="relative p-3 pt-1">
          <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background" />
          <MessageForm projectId={projectId} />
        </div>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.message.role === "USER";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.map((message) => (
          <MessageCard
            key={message.message.id}
            content={message.message.content}
            role={message.message.role}
            fragment={message.fragment}
            createdAt={message.message.createdAt}
            isActiveFragment={!!activeFragment && activeFragment.id === message.fragment?.id}
            onFragmentClick={(f) => setActiveFragment(toActiveFragment(f))}
            type={message.message.type}
          />
        ))}
        {isLastMessageUser && <MessageLoading />}
        <div ref={bottomRef} />
      </div>

      <div className="relative p-2 pt-1">
        <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
}
