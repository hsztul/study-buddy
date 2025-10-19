import { NextRequest, NextResponse } from "next/server";
import { db, word } from "@/lib/db";
import { getWordDefinitions } from "@/lib/dictionary";
import { fetchDefinition, saveDefinitionsToDb } from "@/lib/dictionary";
import { scraperManager } from "@/lib/scrapers/scraper-manager";
import { eq } from "drizzle-orm";

/**
 * GET /api/words/[id]/definition
 * Lazy-load definition for a specific word with multi-tier caching
 * L1: In-memory cache (fastest)
 * L2: Database cache (persistent, 7 days)
 * L3: API scrapers (fallback)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wordId = parseInt(id);

    if (isNaN(wordId)) {
      return NextResponse.json(
        { error: "Invalid word ID" },
        { status: 400 }
      );
    }

    // Fetch word from database
    const wordRecord = await db.query.word.findFirst({
      where: eq(word.id, wordId),
    });

    if (!wordRecord) {
      return NextResponse.json(
        { error: "Word not found" },
        { status: 404 }
      );
    }

    // Fetch definitions with multi-tier caching
    // L1: In-memory → L2: Database → L3: API scrapers
    console.log(`[API] Fetching definition for word: "${wordRecord.term}" (ID: ${wordId})`);
    const apiData = await fetchDefinition(wordRecord.term);

    if (!apiData || apiData.length === 0) {
      console.warn(`[API] No definitions found for "${wordRecord.term}"`);
      return NextResponse.json(
        {
          word: wordRecord.term,
          definitions: [],
          error: "Definition not available. The dictionary API may be temporarily down or this word may not be in the dictionary.",
        },
        { status: 404 }
      );
    }

    // Note: fetchDefinition() already handles saving to DB internally
    // when it fetches from L3 (API scrapers), so no need to save again here

    // Extract simplified definitions for the flashcard
    // Get primary definition (rank 1) from the first meaning
    const simplifiedDefs = [];
    if (apiData[0]?.meanings && apiData[0].meanings.length > 0) {
      const firstMeaning = apiData[0].meanings[0];
      if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
        const primaryDef = firstMeaning.definitions[0];
        simplifiedDefs.push({
          definition: primaryDef.definition,
          example: primaryDef.example,
          partOfSpeech: firstMeaning.partOfSpeech,
        });
      }
    }
    
    console.log(`[API] Successfully fetched definition for "${wordRecord.term}"`);
    return NextResponse.json({
      word: wordRecord.term,
      wordId: wordRecord.id,
      definitions: simplifiedDefs,
    });
  } catch (error) {
    console.error("[API] Error fetching definition:", error);
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout');
    
    return NextResponse.json(
      {
        error: isNetworkError 
          ? "Network error. Please check your connection and try again."
          : "Failed to fetch definition. Please try again later.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
