import { auth, currentUser } from "@clerk/nextjs/server";
import { db, userProfile, sharedStack } from "./db";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user and ensure their profile exists in our database
 * Always syncs latest user data from Clerk to ensure display_name and email are current
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Always get fresh user data from Clerk
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  console.log("[Auth] Processing user sync:", {
    userId: clerkUser.id,
    clerkEmail: email,
    clerkDisplayName: displayName,
  });

  // Check if user profile exists in our database
  let profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
  });

  if (profile) {
    console.log("[Auth] Found existing profile:", {
      userId: profile.userId,
      currentEmail: profile.email,
      currentDisplayName: profile.displayName,
    });

    // Update existing user with fresh data from Clerk
    await db
      .update(userProfile)
      .set({
        email,
        displayName,
      })
      .where(eq(userProfile.userId, userId));
    
    // Get the updated profile
    [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    
    console.log(`[Auth] Updated user profile for ${userId}:`, {
      newEmail: profile.email,
      newDisplayName: profile.displayName,
      emailChanged: profile.email !== email,
      displayNameChanged: profile.displayName !== displayName,
    });
  } else {
    console.log("[Auth] Creating new profile...");
    // Create new user profile
    [profile] = await db
      .insert(userProfile)
      .values({
        userId: clerkUser.id,
        email,
        displayName,
      })
      .returning();

    console.log(`[Auth] Created user profile for ${userId}:`, {
      email: profile.email,
      displayName: profile.displayName,
    });

    // Auto-add SAT Vocabulary stack (stack ID 1) to new users
    try {
      await db.insert(sharedStack).values({
        userId: clerkUser.id,
        stackId: 1, // SAT Vocabulary stack
      });
      console.log(`[Auth] Auto-added SAT Vocabulary stack for new user ${userId}`);
    } catch (error) {
      console.error(`[Auth] Failed to add SAT vocab stack for ${userId}:`, error);
      // Don't fail user creation if this fails
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
