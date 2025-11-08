import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cardStack, sharedStack } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/stacks/[id]/save - Save a shared stack to user's collection
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

    // Check if stack exists
    const [stack] = await db
      .select()
      .from(cardStack)
      .where(eq(cardStack.id, stackId))
      .limit(1);

    if (!stack) {
      return NextResponse.json({ error: "Stack not found" }, { status: 404 });
    }

    // Prevent users from "saving" their own stacks
    if (stack.userId === userId) {
      return NextResponse.json(
        { error: "Cannot save your own stack" },
        { status: 400 }
      );
    }

    // Check if already saved
    const [existing] = await db
      .select()
      .from(sharedStack)
      .where(
        and(eq(sharedStack.userId, userId), eq(sharedStack.stackId, stackId))
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { message: "Stack already saved", alreadySaved: true },
        { status: 200 }
      );
    }

    // Save the shared stack
    await db.insert(sharedStack).values({
      userId,
      stackId,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Stack saved to your collection" 
    });
  } catch (error) {
    console.error("Error saving shared stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
