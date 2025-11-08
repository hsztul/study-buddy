import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sharedStack } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/stacks/[id]/remove - Remove a shared stack from user's collection
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

    // Remove from shared stacks
    const result = await db
      .delete(sharedStack)
      .where(
        and(eq(sharedStack.userId, userId), eq(sharedStack.stackId, stackId))
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Shared stack not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Stack removed from your collection" 
    });
  } catch (error) {
    console.error("Error removing shared stack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
