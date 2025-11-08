import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sharedStack } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/stacks/[id]/is-saved - Check if stack is saved to user's collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ isSaved: false });
    }

    const { id } = await params;
    const stackId = parseInt(id);
    if (isNaN(stackId)) {
      return NextResponse.json({ error: "Invalid stack ID" }, { status: 400 });
    }

    const [saved] = await db
      .select()
      .from(sharedStack)
      .where(
        and(eq(sharedStack.userId, userId), eq(sharedStack.stackId, stackId))
      )
      .limit(1);

    return NextResponse.json({ isSaved: !!saved });
  } catch (error) {
    console.error("Error checking if stack is saved:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
