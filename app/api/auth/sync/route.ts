import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";

/**
 * POST /api/auth/sync
 * Forces a sync of the current user's data from Clerk to our database
 * This ensures display_name and email are always up-to-date
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Auth Sync] Starting user sync...");
    
    // Get raw Clerk data for debugging
    const clerkUser = await currentUser();
    console.log("[Auth Sync] Clerk user data:", {
      userId: clerkUser?.id,
      firstName: clerkUser?.firstName,
      lastName: clerkUser?.lastName,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    
    const user = await getCurrentUser();
    
    if (!user) {
      console.error("[Auth Sync] No user returned from getCurrentUser()");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Auth Sync] User synced successfully:", {
      userId: user.userId,
      displayName: user.displayName,
      email: user.email,
      displayNameIsNull: user.displayName === null,
      emailIsNull: user.email === null,
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
      }
    });
  } catch (error) {
    console.error("[Auth Sync] Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
