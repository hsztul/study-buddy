import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, card } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// PATCH /api/stacks/[id]/cards/reorder - Reorder cards in stack
export async function PATCH(
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
        { error: "Cannot reorder cards in protected stack" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cardOrders } = body;

    // Validation
    if (!Array.isArray(cardOrders)) {
      return NextResponse.json(
        { error: "cardOrders must be an array" },
        { status: 400 }
      );
    }

    if (cardOrders.length === 0) {
      return NextResponse.json(
        { error: "cardOrders cannot be empty" },
        { status: 400 }
      );
    }

    // Validate each order entry
    for (const order of cardOrders) {
      if (typeof order.id !== "number" || typeof order.position !== "number") {
        return NextResponse.json(
          { error: "Each cardOrder must have id and position as numbers" },
          { status: 400 }
        );
      }
      if (order.position < 0) {
        return NextResponse.json(
          { error: "Position must be non-negative" },
          { status: 400 }
        );
      }
    }

    // Verify all cards belong to this stack
    const cardIds = cardOrders.map((order: any) => order.id);
    const cards = await db
      .select({ id: card.id })
      .from(card)
      .where(and(eq(card.stackId, stackId)));

    const validCardIds = new Set(cards.map((c) => c.id));
    const invalidCards = cardIds.filter((id: number) => !validCardIds.has(id));
    
    if (invalidCards.length > 0) {
      return NextResponse.json(
        { error: `Invalid card IDs for this stack: ${invalidCards.join(", ")}` },
        { status: 400 }
      );
    }

    // Update positions in a transaction
    await db.transaction(async (tx) => {
      for (const order of cardOrders) {
        await tx
          .update(card)
          .set({ 
            position: order.position,
            updatedAt: sql`now()`,
          })
          .where(and(eq(card.id, order.id), eq(card.stackId, stackId)));
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Cards reordered successfully",
      updatedCount: cardOrders.length,
    });
  } catch (error) {
    console.error("Error reordering cards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
