import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./user";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
