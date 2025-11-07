import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, card, userCard } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";

// GET /api/stacks/[id]/cards - Get cards in stack (public read access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    const stackId = parseInt(id);
    if (isNaN(stackId)) {
      return NextResponse.json({ error: "Invalid stack ID" }, { status: 400 });
    }

    // Verify stack exists - allow public access to any stack
    const [stack] = await db
      .select()
      .from(cardStack)
      .where(eq(cardStack.id, stackId))
      .limit(1);

    if (!stack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(card.stackId, stackId)];
    if (search) {
      conditions.push(ilike(card.term, `%${search}%`));
    }

    // Fetch cards - only include user progress if authenticated
    let cards;
    
    if (userId) {
      // Authenticated user - include their progress
      cards = await db
        .select({
          id: card.id,
          term: card.term,
          definition: card.definition,
          partOfSpeech: card.partOfSpeech,
          source: card.source,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          hasReviewed: userCard.hasReviewed,
          inTestQueue: userCard.inTestQueue,
          streak: userCard.streak,
          lastResult: userCard.lastResult,
          dueOn: userCard.dueOn,
          lastReviewedAt: userCard.lastReviewedAt,
        })
        .from(card)
        .leftJoin(
          userCard,
          and(eq(userCard.cardId, card.id), eq(userCard.userId, userId))
        )
        .where(and(...conditions))
        .orderBy(card.position, card.createdAt)
        .limit(limit)
        .offset(offset);
    } else {
      // Public user - only basic card info
      cards = await db
        .select({
          id: card.id,
          term: card.term,
          definition: card.definition,
          partOfSpeech: card.partOfSpeech,
          source: card.source,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })
        .from(card)
        .where(and(...conditions))
        .orderBy(card.position, card.createdAt)
        .limit(limit)
        .offset(offset);
    }

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(card)
      .where(and(...conditions));

    return NextResponse.json({
      cards,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
      isPublicView: !userId || userId !== stack.userId,
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/stacks/[id]/cards - Create card in stack
export async function POST(
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

    // Verify stack belongs to user and is not protected
    const [stack] = await db
      .select()
      .from(cardStack)
      .where(and(eq(cardStack.id, stackId), eq(cardStack.userId, userId)))
      .limit(1);

    if (!stack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    if (stack.isProtected) {
      return NextResponse.json(
        { error: "Cannot add cards to protected stack" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { term, definition } = body;

    // Validation
    if (!term || typeof term !== "string" || term.trim().length === 0) {
      return NextResponse.json(
        { error: "Term is required" },
        { status: 400 }
      );
    }

    if (!definition || typeof definition !== "string" || definition.trim().length === 0) {
      return NextResponse.json(
        { error: "Definition is required" },
        { status: 400 }
      );
    }

    if (term.trim().length > 200) {
      return NextResponse.json(
        { error: "Term must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (definition.trim().length > 1000) {
      return NextResponse.json(
        { error: "Definition must be 1000 characters or less" },
        { status: 400 }
      );
    }

    // Get the highest position in the stack
    const [maxPosition] = await db
      .select({ max: sql<number>`COALESCE(MAX(${card.position}), -1)` })
      .from(card)
      .where(eq(card.stackId, stackId));

    // Create card with next position
    const [newCard] = await db
      .insert(card)
      .values({
        stackId,
        term: term.trim(),
        definition: definition.trim(),
        source: "user",
        position: (maxPosition?.max ?? -1) + 1,
      })
      .returning();

    // Create user_card entry
    await db.insert(userCard).values({
      userId,
      cardId: newCard.id,
      stackId,
    });

    return NextResponse.json({ card: newCard }, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
