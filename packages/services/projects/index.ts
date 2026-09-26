import db, { eq, and, desc } from "@repo/database";
import { generateSlug } from "random-word-slugs";
import {
  createProjectSchema,
  CreateProjectSchemaType,
  getAllProjectSchema,
  GetAllProjectsSchemaType,
  getProjectByIdSchema,
  GetProjectByIdSchemaType,
} from "./model";
import { messages, projects, users } from "@repo/database/schema";

class ProjectService {
  private async getUserByClerkId(clerkId: string) {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    return user;
  }

  public async createProject(payload: CreateProjectSchemaType) {
    const { clerkId, message } = await createProjectSchema.parseAsync(payload);
    const user = await this.getUserByClerkId(clerkId);
    if (!user) {
      throw new Error("User not found!");
    }

    const projectId = await db.transaction(async (tx) => {
      // Create project
      const [createdProject] = await tx
        .insert(projects)
        .values({
          name: generateSlug(2, { format: "kebab" }),
          userId: user.id,
        })
        .returning({ id: projects.id });

      if (!createdProject?.id) {
        throw new Error("Failed to create project");
      }

      // Create message
      const [createdMessage] = await tx
        .insert(messages)
        .values({
          content: message.content,
          projectId: createdProject.id,
          role: "USER",
          type: "RESULT",
        })
        .returning({ id: messages.id });

      if (!createdMessage?.id) {
        throw new Error("Failed to create message");
      }

      return createdProject.id;
    });

    return { projectId };

    //todo inngest function invoke krege
  }

  public async getProjectById(payload: GetProjectByIdSchemaType) {
    const { projectId, clerkId } = await getProjectByIdSchema.parseAsync(payload);
    const user = await this.getUserByClerkId(clerkId);
    if (!user) {
      throw new Error("User not found!");
    }
    const result = await db
      .select({ project: projects, message: messages })
      .from(projects)
      .leftJoin(messages, eq(messages.projectId, projects.id))
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

    if (result.length === 0) {
      throw new Error("Project not found");
    }

    const project = {
      ...result[0]?.project,
      messages: result.map((row) => row.message).filter((message) => message !== null),
    };

    return { project };
  }

  public async getAllProjects(payload: GetAllProjectsSchemaType) {
    const { clerkId } = await getAllProjectSchema.parseAsync(payload);
    const user = await this.getUserByClerkId(clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const result = await db
      .select({ projects, messages })
      .from(projects)
      .leftJoin(messages, eq(messages.projectId, projects.id))
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.createdAt));

    const groupProjects = result.reduce(
      (acc, curr) => {
        const projectId = curr.projects.id as string;

        if (!acc[projectId]) {
          acc[projectId] = {
            ...curr.projects,
            messages: [],
          };
        }

        if (curr.messages) {
          acc[projectId].messages.push(curr.messages);
        }

        return acc;
      },
      {} as Record<
        string,
        typeof projects.$inferSelect & {
          messages: (typeof messages.$inferSelect)[];
        }
      >,
    );

    const formattedProjects = Object.values(groupProjects);

    if (formattedProjects.length === 0) {
      throw new Error("No Projects found");
    }

    return { formattedProjects };
  }
}

export default ProjectService;
