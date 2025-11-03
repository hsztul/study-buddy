import { NextRequest, NextResponse } from "next/server";
import { db, card } from "@/lib/db";
import { importWords, type ImportResult } from "@/lib/import-words";
import path from "path";
import { eq } from "drizzle-orm";

/**
 * POST /api/import/retry
 * Retry importing only the words that failed or haven't been imported yet
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization (same as main import)
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",") || [];
    
    if (adminUserIds.length > 0) {
      // TODO: Add Clerk auth check here
    }

    // Read the full word list
    const fs = await import("fs/promises");
    const filePath = path.join(process.cwd(), "docs", "sample-words.json");
    const data = await fs.readFile(filePath, "utf-8");
    const allWords: string[] = JSON.parse(data);

    // Get already imported words
    const existingWords = await db.select({ term: card.term }).from(card);
    const existingTerms = new Set(existingWords.map(w => w.term));

    // Filter to only words that haven't been imported
    const wordsToImport = allWords.filter(w => !existingTerms.has(w.trim()));

    console.log(`[API] Found ${existingWords.length} existing words`);
    console.log(`[API] Will retry ${wordsToImport.length} remaining words`);

    if (wordsToImport.length === 0) {
      return NextResponse.json({
        message: "All words already imported!",
        result: {
          success: 0,
          failed: 0,
          skipped: allWords.length,
          errors: [],
        },
      });
    }

    // Import the remaining words with conservative settings
    const result: ImportResult = await importWords(wordsToImport, {
      batchSize: 2, // Very small batches
      delayMs: 5000, // 5 second delay
      source: "sat_base",
    });

    return NextResponse.json({
      message: "Retry import completed",
      existing: existingWords.length,
      attempted: wordsToImport.length,
      result,
    });
  } catch (error) {
    console.error("[API] Retry import error:", error);
    return NextResponse.json(
      {
        error: "Failed to retry import",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import/retry
 * Check import status
 */
export async function GET() {
  try {
    const fs = await import("fs/promises");
    const filePath = path.join(process.cwd(), "docs", "sample-words.json");
    const data = await fs.readFile(filePath, "utf-8");
    const allWords: string[] = JSON.parse(data);

    const existingWords = await db.select({ term: card.term }).from(card);
    const remaining = allWords.length - existingWords.length;

    return NextResponse.json({
      total: allWords.length,
      imported: existingWords.length,
      remaining,
      percentage: Math.round((existingWords.length / allWords.length) * 100),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
