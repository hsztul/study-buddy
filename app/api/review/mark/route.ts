import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userWord } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { wordId } = body;

    if (!wordId || typeof wordId !== "number") {
      return NextResponse.json({ error: "Invalid word ID" }, { status: 400 });
    }

    // Check if userWord record exists
    const existingRecord = await db
      .select()
      .from(userWord)
      .where(and(eq(userWord.userId, userId), eq(userWord.wordId, wordId)))
      .limit(1);

    const now = new Date();

    if (existingRecord.length === 0) {
      // Create new userWord record with reviewed status
      await db.insert(userWord).values({
        userId,
        wordId,
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
        .update(userWord)
        .set({
          hasReviewed: true,
          firstReviewedAt: record.firstReviewedAt || now,
          lastReviewedAt: now,
        })
        .where(and(eq(userWord.userId, userId), eq(userWord.wordId, wordId)));
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
