"use client";
import { trpc } from "@/trpc/client";

export function useCreateProject() {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createProjectAsync,
    error,
    isError,
    isIdle,
    isPending,
    isSuccess,
    status,
  } = trpc.project.createProject.useMutation({
    onSuccess: async () => {
      //when new project gets created the older projects list should be considered stale and new list of projects should be fetched
      await utils.project.getAllProjects.invalidate();
    },
  });

  return { createProjectAsync, error, isError, isPending, isSuccess, isIdle, status };
}

export function useGetProjectById(
  input: Parameters<typeof trpc.project.getProjectById.useQuery>[0]
) {
  const { data, error, isError, isPending, isSuccess, status } =
    trpc.project.getProjectById.useQuery(input);

  return { data, error, isError, isPending, isSuccess, status };
}

export function useGetAllProjects(
  input: Parameters<typeof trpc.project.getAllProjects.useQuery>[0],
) {
  const { data, error, isError, isPending, isLoading, isSuccess, status } =
    trpc.project.getAllProjects.useQuery(input);

  return { data, error, isError, isPending, isSuccess, status, isLoading };
}
