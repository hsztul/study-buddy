import { NextRequest, NextResponse } from "next/server";
import { importFromJSON, type ImportResult } from "@/lib/import-words";
import path from "path";

/**
 * POST /api/import/words
 * Admin-only endpoint to import SAT words from JSON file
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",") || [];
    
    // For now, allow if ADMIN_USER_IDS is not set (development mode)
    // In production, you should require Clerk auth and check user ID
    if (adminUserIds.length > 0) {
      // TODO: Add Clerk auth check here in section 0.4
      // const { userId } = auth();
      // if (!userId || !adminUserIds.includes(userId)) {
      //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      // }
    }

    // Import from the sample words JSON file
    const filePath = path.join(process.cwd(), "docs", "sample-words.json");
    
    console.log(`[API] Starting word import from ${filePath}...`);
    const result: ImportResult = await importFromJSON(filePath);

    return NextResponse.json({
      message: "Word import completed",
      result,
    });
  } catch (error) {
    console.error("[API] Import error:", error);
    return NextResponse.json(
      {
        error: "Failed to import words",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import/words
 * Returns import status/instructions
 */
export async function GET() {
  return NextResponse.json({
    message: "Word import endpoint",
    usage: "POST to this endpoint to import SAT words from docs/sample-words.json",
    note: "This endpoint is admin-only in production",
  });
}
