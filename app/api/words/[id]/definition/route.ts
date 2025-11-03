import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { card } from "@/lib/db/schema";
import { fetchDefinition, saveDefinitionsToDb } from "@/lib/dictionary";
import { scraperManager } from "@/lib/scrapers/scraper-manager";
import { eq } from "drizzle-orm";

/**
 * GET /api/words/[id]/definition
 * Lazy-load definition for a specific card with multi-tier caching
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
    const cardId = parseInt(id);

    if (isNaN(cardId)) {
      return NextResponse.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    // Fetch card from database
    const cardRecord = await db.query.card.findFirst({
      where: eq(card.id, cardId),
    });

    if (!cardRecord) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Fetch definitions with multi-tier caching
    // L1: In-memory → L2: Database → L3: API scrapers
    console.log(`[API] Fetching definition for word: "${cardRecord.term}" (ID: ${cardId})`);
    const apiData = await fetchDefinition(cardRecord.term);

    if (!apiData || apiData.length === 0) {
      console.warn(`[API] No definitions found for "${cardRecord.term}"`);
      return NextResponse.json(
        {
          word: cardRecord.term,
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
    
    console.log(`[API] Successfully fetched definition for "${cardRecord.term}"`);
    return NextResponse.json({
      word: cardRecord.term,
      wordId: cardRecord.id,
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
