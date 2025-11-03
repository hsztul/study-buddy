import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, card } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/stacks/[id]/cards/[cardId] - Update card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, cardId: cardIdStr } = await params;
    const stackId = parseInt(id);
    const cardId = parseInt(cardIdStr);

    if (isNaN(stackId) || isNaN(cardId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
        { error: "Cannot edit cards in protected stack" },
        { status: 403 }
      );
    }

    // Verify card belongs to stack
    const [existingCard] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, cardId), eq(card.stackId, stackId)))
      .limit(1);

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const body = await request.json();
    const { term, definition } = body;

    // Validation
    if (term !== undefined) {
      if (typeof term !== "string" || term.trim().length === 0) {
        return NextResponse.json(
          { error: "Term cannot be empty" },
          { status: 400 }
        );
      }
      if (term.trim().length > 200) {
        return NextResponse.json(
          { error: "Term must be 200 characters or less" },
          { status: 400 }
        );
      }
    }

    if (definition !== undefined) {
      if (typeof definition !== "string" || definition.trim().length === 0) {
        return NextResponse.json(
          { error: "Definition cannot be empty" },
          { status: 400 }
        );
      }
      if (definition.trim().length > 1000) {
        return NextResponse.json(
          { error: "Definition must be 1000 characters or less" },
          { status: 400 }
        );
      }
    }

    // Update card
    const updateData: any = { updatedAt: new Date() };
    if (term !== undefined) updateData.term = term.trim();
    if (definition !== undefined) updateData.definition = definition.trim();

    const [updatedCard] = await db
      .update(card)
      .set(updateData)
      .where(eq(card.id, cardId))
      .returning();

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stacks/[id]/cards/[cardId] - Delete card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, cardId: cardIdStr } = await params;
    const stackId = parseInt(id);
    const cardId = parseInt(cardIdStr);

    if (isNaN(stackId) || isNaN(cardId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
        { error: "Cannot delete cards from protected stack" },
        { status: 403 }
      );
    }

    // Verify card belongs to stack
    const [existingCard] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, cardId), eq(card.stackId, stackId)))
      .limit(1);

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Delete card (cascade will handle user_card, attempts, etc.)
    await db.delete(card).where(eq(card.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
