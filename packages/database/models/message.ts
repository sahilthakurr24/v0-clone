import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projects } from "./project";

export const messageRoleEnum = pgEnum("message_role", ["USER", "ASSISTANT"]);

export const messageTypeEnum = pgEnum("message_type", ["RESULT", "ERROR"]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),

  content: text("content").notNull(),

  role: messageRoleEnum("role").notNull(),

  type: messageTypeEnum("type").notNull(),

  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, {
      onDelete: "cascade",
    }),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
