// Load environment variables first
import "../scripts/load-env";

/**
 * Manual test script to verify the sync endpoint works
 * Run this with: npx tsx lib/test-sync-endpoint.ts
 */
async function testSyncEndpoint() {
  try {
    console.log("[Test] Testing sync endpoint directly...");
    
    // This would normally require authentication, but let's see what happens
    const response = await fetch('http://localhost:3000/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.text();
    console.log("[Test] Response status:", response.status);
    console.log("[Test] Response body:", result);
    
    if (response.ok) {
      console.log("[Test] ✅ Sync endpoint is accessible");
    } else {
      console.log("[Test] ❌ Sync endpoint returned error (expected without auth)");
    }
    
  } catch (error) {
    console.error("[Test] Error calling sync endpoint:", error);
    console.log("[Test] Make sure the dev server is running on localhost:3000");
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testSyncEndpoint();
}

export { testSyncEndpoint };
