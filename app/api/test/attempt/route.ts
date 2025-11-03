import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attempt, card, definition, userCard } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { transcribeAudio } from "@/lib/whisper";
import { gradeDefinition } from "@/lib/grader";
import { updateUserCard } from "@/lib/spaced-repetition";

/**
 * POST /api/test/attempt
 * Process a test attempt: transcribe audio and grade response
 * Phase 1: Uses AI grading with gpt-4o-mini
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const wordIdStr = formData.get("wordId") as string | null;

    if (!audioFile || !wordIdStr) {
      return NextResponse.json(
        { error: "Missing audio or wordId" },
        { status: 400 }
      );
    }

    const wordId = parseInt(wordIdStr, 10);
    if (isNaN(wordId)) {
      return NextResponse.json({ error: "Invalid wordId" }, { status: 400 });
    }

    const startTime = Date.now();

    // 1. Transcribe audio using Whisper
    let transcript: string;
    try {
      transcript = await transcribeAudio(audioFile);
    } catch (error) {
      console.error("Transcription error:", error);
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }

    // 2. Get card and its primary definition
    const cardData = await db
      .select({
        term: card.term,
        definition: definition.definition,
      })
      .from(card)
      .leftJoin(definition, eq(card.id, definition.cardId))
      .where(and(eq(card.id, wordId), eq(definition.rank, 1)))
      .limit(1);

    if (cardData.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const { term, definition: cardDefinition } = cardData[0];

    // 3. Grade the response using AI (gpt-4o-mini)
    const gradeResult = await gradeDefinition(
      term,
      cardDefinition || "No definition available",
      transcript
    );

    const latencyMs = Date.now() - startTime;

    // 4. Log attempt to database
    await db.insert(attempt).values({
      userId,
      cardId: wordId,
      stackId: 1, // Default stack for backwards compatibility
      mode: "test",
      transcript,
      grade: gradeResult.grade,
      score: gradeResult.score,
      feedback: gradeResult.feedback,
      latencyMs,
    });

    // 5. Update user_card with spaced repetition scheduling
    // For backwards compatibility, use default stack ID 1 (SAT Vocabulary)
    const srResult = await updateUserCard(userId, wordId, 1, gradeResult.grade);

    // 6. Return result
    return NextResponse.json({
      grade: gradeResult.grade,
      score: gradeResult.score,
      transcript,
      feedback: gradeResult.feedback,
      latencyMs,
    });
  } catch (error) {
    console.error("Attempt API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
