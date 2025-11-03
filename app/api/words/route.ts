import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { card, userCard } from "@/lib/db/schema";
import { eq, sql, and, ilike } from "drizzle-orm";

// Deprecated: Use /api/stacks/[id]/cards instead
// This route is kept for backwards compatibility with old review page
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

    // Default to SAT Vocabulary stack (ID 1) for backwards compatibility
    const stackId = 1;

    // Build query conditions
    const conditions = [eq(card.stackId, stackId)];
    if (query) {
      conditions.push(ilike(card.term, `%${query}%`));
    }

    // Fetch cards with user-specific data (if exists)
    const cards = await db
      .select({
        id: card.id,
        term: card.term,
        partOfSpeech: card.partOfSpeech,
        source: card.source,
        inTestQueue: userCard.inTestQueue,
        streak: userCard.streak,
        lastResult: userCard.lastResult,
      })
      .from(card)
      .leftJoin(
        userCard,
        and(eq(userCard.cardId, card.id), eq(userCard.userId, userId))
      )
      .where(and(...conditions))
      .orderBy(card.term)
      .limit(limit + 1) // Fetch one extra to check if there's more
      .offset(cursor);

    // Check if there are more results
    const hasMore = cards.length > limit;
    const results = hasMore ? cards.slice(0, limit) : cards;
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
