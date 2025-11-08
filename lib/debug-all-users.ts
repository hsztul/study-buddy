// Load environment variables first
import "../scripts/load-env";

import { db, userProfile } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Comprehensive debug script to check all user profiles
 */
async function debugAllUserProfiles() {
  try {
    console.log("[Debug] Fetching all user profiles from database...");
    
    // Get all user profiles
    const allProfiles = await db.select().from(userProfile);
    
    console.log(`[Debug] Found ${allProfiles.length} user profile(s):`);
    
    allProfiles.forEach((profile, index) => {
      console.log(`[Debug] Profile ${index + 1}:`, {
        userId: profile.userId,
        displayName: profile.displayName,
        email: profile.email,
        createdAt: profile.createdAt,
        displayNameIsNull: profile.displayName === null,
        emailIsNull: profile.email === null,
        displayNameIsEmpty: profile.displayName === '',
        emailIsEmpty: profile.email === '',
      });
    });
    
    return allProfiles;
  } catch (error) {
    console.error("[Debug] Error fetching user profiles:", error);
    return [];
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  debugAllUserProfiles()
    .then((profiles) => {
      console.log(`\n[Debug] Summary: ${profiles.length} profile(s) found`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Debug] Unexpected error:", error);
      process.exit(1);
    });
}

export { debugAllUserProfiles };
