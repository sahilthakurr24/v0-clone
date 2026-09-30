"use client";
import { trpc } from "@/trpc/client";

export function useCreateMessage() {
  const utils = trpc.useUtils();

  const {
    mutateAsync: createMessageAsync,
    error,
    isError,
    isIdle,
    isPending,
    isSuccess,
    status,
  } = trpc.message.createMessage.useMutation({
    onSuccess: async () => {
      await utils.message.getMessages.invalidate();
    },
  });

  return { createMessageAsync, error, isError, isIdle, isPending, isSuccess, status };
}

export function useGetMessages(input: Parameters<typeof trpc.message.getMessages.useQuery>[0]) {
  const { data, error, isError, isPending, isSuccess, status } =
    trpc.message.getMessages.useQuery(input);

  return { data, error, isError, isPending, isSuccess, status };
}
