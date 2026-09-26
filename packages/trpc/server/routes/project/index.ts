import { zodUndefinedModel } from "../../schema";
import { projectService } from "../../services";
import { authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createProjectInputSchema,
  createProjectOutputSchema,
  getProjectByIdInputSchema,
  getProjectByIdOutputSchema,
  getProjectsOutputSchema,
} from "./model";

const TAGS = ["PROJECT"];
const getPath = generatePath("/project");

export const projectRouter = router({
  createProject: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/create-project"), tags: TAGS } })
    .input(createProjectInputSchema)
    .output(createProjectOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = input.message;
      const clerkId = ctx.clerkId;
      const { projectId } = await projectService.createProject({ clerkId, message });
      return { projectId };
    }),

  getProjectById: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("get-project-by-id"), tags: TAGS } })
    .input(getProjectByIdInputSchema)
    .output(getProjectByIdOutputSchema)
    .query(async ({ ctx, input }) => {
      const clerkId = ctx.clerkId;
      const projectId = input.projectId;

      const { project } = await projectService.getProjectById({ clerkId, projectId });

      return project;
    }),

  getAllProjects: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("get-all-projects"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(getProjectsOutputSchema)
    .query(async ({ ctx }) => {
      const clerkId = ctx.clerkId;

      const { formattedProjects } = await projectService.getAllProjects({ clerkId });
      return formattedProjects;
    }),
});
