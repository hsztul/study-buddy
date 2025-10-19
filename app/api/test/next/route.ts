import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { word, userWord } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getDueWords } from "@/lib/spaced-repetition";

/**
 * GET /api/test/next?limit=20
 * Returns words for testing
 * Phase 1: Prioritizes SR-due words, then queued words
 * Shuffles and limits results
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Phase 1: Prioritize SR-due words, then queued words
    const dueWordIds = await getDueWords(userId, limit);
    
    // Get queued words (not already due)
    const queuedWords = await db
      .select({
        id: word.id,
        term: word.term,
        partOfSpeech: word.partOfSpeech,
      })
      .from(word)
      .innerJoin(
        userWord,
        and(
          eq(word.id, userWord.wordId),
          eq(userWord.userId, userId),
          eq(userWord.inTestQueue, true)
        )
      )
      .limit(limit);

    // Get due words details
    const dueWordsDetails = dueWordIds.length > 0
      ? await db
          .select({
            id: word.id,
            term: word.term,
            partOfSpeech: word.partOfSpeech,
          })
          .from(word)
          .where(inArray(word.id, dueWordIds))
      : [];

    // Combine: due words first, then queued words (avoiding duplicates)
    const dueSet = new Set(dueWordIds);
    const queuedFiltered = queuedWords.filter((w) => !dueSet.has(w.id));
    const combined = [...dueWordsDetails, ...queuedFiltered].slice(0, limit);

    // Shuffle the words
    const shuffled = combined.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      words: shuffled,
      count: shuffled.length,
      dueCount: dueWordsDetails.length,
      queuedCount: queuedFiltered.length,
    });
  } catch (error) {
    console.error("Test next API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
