import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userCard, userProfile, card } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const toggleQueueSchema = z.object({
  cardId: z.number(),
  stackId: z.number(),
  add: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, stackId, add } = toggleQueueSchema.parse(body);

    // Verify card belongs to stack
    const [cardRecord] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, cardId), eq(card.stackId, stackId)))
      .limit(1);

    if (!cardRecord) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Ensure user profile exists
    await db
      .insert(userProfile)
      .values({ userId })
      .onConflictDoNothing();

    // Upsert user_card record
    await db
      .insert(userCard)
      .values({
        userId,
        cardId,
        stackId,
        inTestQueue: add,
      })
      .onConflictDoUpdate({
        target: [userCard.userId, userCard.cardId],
        set: { inTestQueue: add },
      });

    return NextResponse.json({ success: true, inTestQueue: add });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error toggling test queue:", error);
    return NextResponse.json(
      { error: "Failed to update test queue" },
      { status: 500 }
    );
  }
}
