import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, userWord, userProfile } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const toggleQueueSchema = z.object({
  wordId: z.number(),
  add: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { wordId, add } = toggleQueueSchema.parse(body);

    // Ensure user profile exists
    await db
      .insert(userProfile)
      .values({ userId })
      .onConflictDoNothing();

    // Upsert user_word record
    await db
      .insert(userWord)
      .values({
        userId,
        wordId,
        inTestQueue: add,
      })
      .onConflictDoUpdate({
        target: [userWord.userId, userWord.wordId],
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
