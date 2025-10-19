import { auth, currentUser } from "@clerk/nextjs/server";
import { db, userProfile } from "./db";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user and ensure their profile exists in our database
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Check if user profile exists in our database
  let profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
  });

  // If profile doesn't exist, create it from Clerk data
  if (!profile) {
    const clerkUser = await currentUser();

    if (clerkUser) {
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
      const displayName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        null;

      [profile] = await db
        .insert(userProfile)
        .values({
          userId: clerkUser.id,
          email,
          displayName,
        })
        .returning();

      console.log(`[Auth] Created user profile for ${userId}`);
    }
  }

  return profile;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
