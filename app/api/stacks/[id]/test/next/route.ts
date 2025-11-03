import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { card, userCard } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getDueWordsForStack } from "@/lib/spaced-repetition";

/**
 * GET /api/stacks/[id]/test/next?limit=20
 * Returns cards for testing from a specific stack
 * Phase 1: Prioritizes SR-due cards, then queued cards
 * Shuffles and limits results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const stackId = parseInt(id);
    if (isNaN(stackId)) {
      return NextResponse.json({ error: "Invalid stack ID" }, { status: 400 });
    }

    // Get limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Phase 1: Prioritize SR-due cards, then queued cards
    const dueCardIds = await getDueWordsForStack(userId, stackId, limit);
    
    // Get queued cards (not already due)
    const queuedCards = await db
      .select({
        id: card.id,
        term: card.term,
        partOfSpeech: card.partOfSpeech,
      })
      .from(card)
      .innerJoin(
        userCard,
        and(
          eq(card.id, userCard.cardId),
          eq(userCard.userId, userId),
          eq(userCard.stackId, stackId),
          eq(userCard.inTestQueue, true)
        )
      )
      .limit(limit);

    // Get due cards details
    const dueCardsDetails = dueCardIds.length > 0
      ? await db
          .select({
            id: card.id,
            term: card.term,
            partOfSpeech: card.partOfSpeech,
          })
          .from(card)
          .where(inArray(card.id, dueCardIds))
      : [];

    // Combine: due cards first, then queued cards (avoiding duplicates)
    const dueSet = new Set(dueCardIds);
    const queuedFiltered = queuedCards.filter((w) => !dueSet.has(w.id));
    const combined = [...dueCardsDetails, ...queuedFiltered].slice(0, limit);

    // Shuffle the cards
    const shuffled = combined.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      cards: shuffled,
      count: shuffled.length,
      dueCount: dueCardsDetails.length,
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
