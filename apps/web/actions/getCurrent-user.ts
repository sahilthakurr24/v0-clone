"use server";
import { currentUser } from "@repo/auth/nextjs";
import { db, eq, schema } from "@repo/database";

export async function onboardUser() {
  const user = await currentUser();
  if (!user) return;
  const [newUser] = await db
    .insert(schema.users)
    .values({
      clerkId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      email: user.emailAddresses[0]?.emailAddress,
      imageUrl: user.imageUrl ?? "",
    })
    .onConflictDoNothing({
      target: schema.users.clerkId,
    })
    .returning({ id: schema.users.id });

  if (newUser) {
    return newUser;
  }

  const [existingUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.clerkId, user.id))
    .limit(1);

  return existingUser ?? null;
}
