import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recomputeDueDates } from "@/lib/aggregate-stats";

/**
 * POST /api/admin/recompute-due
 * Admin-only endpoint to recompute due dates
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",") || [];
    if (!adminUserIds.includes(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const targetUserId = body.userId || userId;

    await recomputeDueDates(targetUserId);

    return NextResponse.json({
      success: true,
      message: "Due dates recomputed successfully",
    });
  } catch (error) {
    console.error("Recompute due API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
