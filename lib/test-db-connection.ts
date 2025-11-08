// Load environment variables first
import "../scripts/load-env";

import { db, userProfile } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Test script to verify database connection and user profile updates
 * Run this with: npx tsx lib/test-db-connection.ts
 */
async function testDatabaseConnection() {
  try {
    console.log("[Test] Testing database connection...");
    
    // Test basic connection
    const result = await db.select().from(userProfile).limit(1);
    console.log("[Test] Database connection successful!");
    console.log("[Test] Found", result.length, "user profiles in database");
    
    if (result.length > 0) {
      console.log("[Test] Sample user profile:", {
        userId: result[0].userId,
        displayName: result[0].displayName,
        email: result[0].email,
        createdAt: result[0].createdAt,
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Test] Database connection failed:", error);
    return false;
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("[Test] Unexpected error:", error);
      process.exit(1);
    });
}

export { testDatabaseConnection };
