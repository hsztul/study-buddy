import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, card, userCard } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/stacks/[id] - Get stack details
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

    // Fetch stack
    const [stack] = await db
      .select()
      .from(cardStack)
      .where(and(eq(cardStack.id, stackId), eq(cardStack.userId, userId)))
      .limit(1);

    if (!stack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    return NextResponse.json({ stack });
  } catch (error) {
    console.error("Error fetching stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/stacks/[id] - Update stack name
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

    // Check if stack exists and belongs to user
    const [existingStack] = await db
      .select()
      .from(cardStack)
      .where(and(eq(cardStack.id, stackId), eq(cardStack.userId, userId)))
      .limit(1);

    if (!existingStack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    // Check if stack is protected
    if (existingStack.isProtected) {
      return NextResponse.json(
        { error: "Cannot edit protected stack" },
        { status: 403 }
      );
    }

    // Update stack
    const [updatedStack] = await db
      .update(cardStack)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(eq(cardStack.id, stackId))
      .returning();

    return NextResponse.json({ stack: updatedStack });
  } catch (error) {
    console.error("Error updating stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stacks/[id] - Delete stack
export async function DELETE(
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

    // Check if stack exists and belongs to user
    const [existingStack] = await db
      .select()
      .from(cardStack)
      .where(and(eq(cardStack.id, stackId), eq(cardStack.userId, userId)))
      .limit(1);

    if (!existingStack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    // Check if stack is protected
    if (existingStack.isProtected) {
      return NextResponse.json(
        { error: "Cannot delete protected stack" },
        { status: 403 }
      );
    }

    // Delete stack (cascade will handle cards, user_cards, etc.)
    await db.delete(cardStack).where(eq(cardStack.id, stackId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
