import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  clerkId: text("clerk_id").notNull().unique(),

  email: text("email").unique(),

  firstName: text("first_name"),

  lastName: text("last_name"),

  name: text("name"),

  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
