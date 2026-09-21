import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

import { messages } from "./message";

export const fragments = pgTable("fragments", {
  id: uuid("id").primaryKey().defaultRandom(),

  messageId: uuid("message_id")
    .notNull()
    .unique()
    .references(() => messages.id, {
      onDelete: "cascade",
    }),

  sandboxUrl: text("sandbox_url").notNull(),

  title: text("title").notNull(),

  files: jsonb("files").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
