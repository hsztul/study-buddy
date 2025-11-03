import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userCard, attempt } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    const cardIdNum = parseInt(cardId);
    if (isNaN(cardIdNum)) {
      return NextResponse.json({ error: "Invalid card ID" }, { status: 400 });
    }

    // Check if the user has any attempts for this card
    const attemptCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attempt)
      .where(and(eq(attempt.userId, userId), eq(attempt.cardId, cardIdNum)));

    if (attemptCount[0]?.count > 0) {
      return NextResponse.json(
        { error: "Cannot remove card that has been tested" },
        { status: 400 }
      );
    }

    // Update the userCard record to remove reviewed status
    const updateResult = await db
      .update(userCard)
      .set({
        hasReviewed: false,
        firstReviewedAt: null,
        lastReviewedAt: null,
      })
      .where(and(eq(userCard.userId, userId), eq(userCard.cardId, cardIdNum)))
      .returning();

    if (updateResult.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
