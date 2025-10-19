import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attempt, word, definition, userWord } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { transcribeAudio } from "@/lib/whisper";
import { gradeDefinition } from "@/lib/grader";
import { updateUserWord } from "@/lib/spaced-repetition";

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

    // 2. Get word and its primary definition
    const wordData = await db
      .select({
        term: word.term,
        definition: definition.definition,
      })
      .from(word)
      .leftJoin(definition, eq(word.id, definition.wordId))
      .where(and(eq(word.id, wordId), eq(definition.rank, 1)))
      .limit(1);

    if (wordData.length === 0) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    const { term, definition: wordDefinition } = wordData[0];

    // 3. Grade the response using AI (gpt-4o-mini)
    const gradeResult = await gradeDefinition(
      term,
      wordDefinition || "No definition available",
      transcript
    );

    const latencyMs = Date.now() - startTime;

    // 4. Log attempt to database
    await db.insert(attempt).values({
      userId,
      wordId,
      mode: "test",
      transcript,
      grade: gradeResult.grade,
      score: gradeResult.score,
      feedback: gradeResult.feedback,
      latencyMs,
    });

    // 5. Update user_word with spaced repetition scheduling
    const srResult = await updateUserWord(userId, wordId, gradeResult.grade);

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
