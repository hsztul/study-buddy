import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, card, userCard, sharedStack } from "@/lib/db/schema";
import { eq, and, count, sql, desc, or } from "drizzle-orm";

// GET /api/stacks - List user's card stacks (owned + shared)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch stacks owned by the user
    const ownedStacks = await db
      .select({
        id: cardStack.id,
        name: cardStack.name,
        isProtected: cardStack.isProtected,
        createdAt: cardStack.createdAt,
        updatedAt: cardStack.updatedAt,
        cardCount: sql<number>`COUNT(DISTINCT ${card.id})`.as("card_count"),
        reviewedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${userCard.hasReviewed} = true THEN ${userCard.cardId} END)`.as("reviewed_count"),
        masteredCount: sql<number>`COUNT(DISTINCT CASE WHEN ${userCard.lastResult} = 'pass' THEN ${userCard.cardId} END)`.as("mastered_count"),
        lastStudied: sql<Date>`MAX(${userCard.lastReviewedAt})`.as("last_studied"),
        isShared: sql<boolean>`false`.as("is_shared"),
        ownerId: cardStack.userId,
      })
      .from(cardStack)
      .leftJoin(card, eq(card.stackId, cardStack.id))
      .leftJoin(
        userCard,
        and(eq(userCard.stackId, cardStack.id), eq(userCard.userId, userId))
      )
      .where(eq(cardStack.userId, userId))
      .groupBy(cardStack.id)
      .orderBy(desc(cardStack.createdAt));

    // Fetch shared stacks (stacks saved by the user)
    const savedSharedStacks = await db
      .select({
        id: cardStack.id,
        name: cardStack.name,
        isProtected: cardStack.isProtected,
        createdAt: cardStack.createdAt,
        updatedAt: cardStack.updatedAt,
        cardCount: sql<number>`COUNT(DISTINCT ${card.id})`.as("card_count"),
        reviewedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${userCard.hasReviewed} = true THEN ${userCard.cardId} END)`.as("reviewed_count"),
        masteredCount: sql<number>`COUNT(DISTINCT CASE WHEN ${userCard.lastResult} = 'pass' THEN ${userCard.cardId} END)`.as("mastered_count"),
        lastStudied: sql<Date>`MAX(${userCard.lastReviewedAt})`.as("last_studied"),
        isShared: sql<boolean>`true`.as("is_shared"),
        ownerId: cardStack.userId,
      })
      .from(sharedStack)
      .innerJoin(cardStack, eq(cardStack.id, sharedStack.stackId))
      .leftJoin(card, eq(card.stackId, cardStack.id))
      .leftJoin(
        userCard,
        and(eq(userCard.stackId, cardStack.id), eq(userCard.userId, userId))
      )
      .where(eq(sharedStack.userId, userId))
      .groupBy(cardStack.id, sharedStack.savedAt)
      .orderBy(desc(sharedStack.savedAt));

    // Combine and return both lists
    const allStacks = [...ownedStacks, ...savedSharedStacks];

    return NextResponse.json({ stacks: allStacks });
  } catch (error) {
    console.error("Error fetching stacks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/stacks - Create new stack
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Stack name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Stack name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Create the stack
    const [newStack] = await db
      .insert(cardStack)
      .values({
        userId,
        name: name.trim(),
        isProtected: false,
      })
      .returning();

    return NextResponse.json({ stack: newStack }, { status: 201 });
  } catch (error) {
    console.error("Error creating stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
