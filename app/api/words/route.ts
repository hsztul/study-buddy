import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, word, userWord } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cursor = parseInt(searchParams.get("cursor") || "0");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const query = searchParams.get("q") || "";

    // Build query
    let whereClause = query
      ? sql`${word.term} ILIKE ${`%${query}%`}`
      : undefined;

    // Fetch words with user-specific data (if exists)
    const words = await db
      .select({
        id: word.id,
        term: word.term,
        partOfSpeech: word.partOfSpeech,
        source: word.source,
        inTestQueue: userWord.inTestQueue,
        streak: userWord.streak,
        lastResult: userWord.lastResult,
      })
      .from(word)
      .leftJoin(
        userWord,
        and(eq(userWord.wordId, word.id), eq(userWord.userId, userId))
      )
      .where(whereClause)
      .orderBy(word.term)
      .limit(limit + 1) // Fetch one extra to check if there's more
      .offset(cursor);

    // Check if there are more results
    const hasMore = words.length > limit;
    const results = hasMore ? words.slice(0, limit) : words;
    const nextCursor = hasMore ? cursor + limit : null;

    return NextResponse.json({
      words: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching words:", error);
    return NextResponse.json(
      { error: "Failed to fetch words" },
      { status: 500 }
    );
  }
}
