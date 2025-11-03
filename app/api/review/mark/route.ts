import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userCard, card } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, stackId } = body;

    if (!cardId || typeof cardId !== "number") {
      return NextResponse.json({ error: "Invalid card ID" }, { status: 400 });
    }

    if (!stackId || typeof stackId !== "number") {
      return NextResponse.json({ error: "Invalid stack ID" }, { status: 400 });
    }

    // Verify card belongs to stack
    const [cardRecord] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, cardId), eq(card.stackId, stackId)))
      .limit(1);

    if (!cardRecord) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if userCard record exists
    const existingRecord = await db
      .select()
      .from(userCard)
      .where(and(eq(userCard.userId, userId), eq(userCard.cardId, cardId)))
      .limit(1);

    const now = new Date();

    if (existingRecord.length === 0) {
      // Create new userCard record with reviewed status
      await db.insert(userCard).values({
        userId,
        cardId,
        stackId,
        hasReviewed: true,
        firstReviewedAt: now,
        lastReviewedAt: now,
        inTestQueue: false,
        ease: 2.5,
        intervalDays: 0,
        streak: 0,
      });
    } else {
      // Update existing record
      const record = existingRecord[0];
      await db
        .update(userCard)
        .set({
          hasReviewed: true,
          firstReviewedAt: record.firstReviewedAt || now,
          lastReviewedAt: now,
        })
        .where(and(eq(userCard.userId, userId), eq(userCard.cardId, cardId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking card as reviewed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
