// Load environment variables first
import "../scripts/load-env";

import { db, userProfile } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Script to verify the exact database connection and show connection details
 */
async function verifyDatabaseConnection() {
  try {
    console.log("[Verify] DATABASE_URL:", process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log("[Verify] Database URL details:");
    
    if (process.env.DATABASE_URL) {
      // Parse connection details (without showing full URL for security)
      const url = new URL(process.env.DATABASE_URL);
      console.log(`[Verify] Host: ${url.hostname}`);
      console.log(`[Verify] Database: ${url.pathname.slice(1)}`);
      console.log(`[Verify] User: ${url.username}`);
    }
    
    console.log("\n[Verify] Testing database connection...");
    
    // Test with raw SQL to see exactly what's in the database
    const result = await db.execute(`
      SELECT 
        user_id,
        display_name,
        email,
        created_at,
        CASE WHEN display_name IS NULL THEN 'display_name is NULL' ELSE 'display_name has value' END as display_name_status,
        CASE WHEN email IS NULL THEN 'email is NULL' ELSE 'email has value' END as email_status
      FROM user_profile
      ORDER BY created_at DESC
    `);
    
    console.log(`\n[Verify] Raw SQL result - Found ${result.rows.length} row(s):`);
    
    result.rows.forEach((row: any, index: number) => {
      console.log(`\n[Verify] Row ${index + 1}:`);
      console.log(`  user_id: ${row.user_id}`);
      console.log(`  display_name: "${row.display_name}" (${row.display_name_status})`);
      console.log(`  email: "${row.email}" (${row.email_status})`);
      console.log(`  created_at: ${row.created_at}`);
    });
    
    return result.rows;
  } catch (error) {
    console.error("[Verify] Error:", error);
    return [];
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  verifyDatabaseConnection()
    .then((rows) => {
      console.log(`\n[Verify] Complete! Found ${rows.length} user profile(s).`);
      console.log("[Verify] If you're seeing empty values in Neon but not here, check:");
      console.log("  1. You're connected to the same database (check connection details)");
      console.log("  2. You're looking at the correct table (user_profile)");
      console.log("  3. You're looking at the correct row (user_id matches above)");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Verify] Unexpected error:", error);
      process.exit(1);
    });
}

export { verifyDatabaseConnection };
