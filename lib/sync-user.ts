import { db } from "@/lib/db";
import { userProfile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Syncs a user from Clerk to the database
 * Creates or updates the user_profile record
 */
export async function syncUser(data: {
  userId: string;
  email: string;
  displayName: string;
}) {
  const { userId, email, displayName } = data;

  // Check if user exists
  const existing = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing user
    await db
      .update(userProfile)
      .set({
        email,
        displayName,
      })
      .where(eq(userProfile.userId, userId));
  } else {
    // Create new user
    await db.insert(userProfile).values({
      userId,
      email,
      displayName,
    });
  }

  return { success: true };
}
