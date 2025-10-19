import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Transcribe audio using OpenAI Whisper via Vercel AI SDK
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Convert blob to base64 for API
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use OpenAI's Whisper model via Vercel AI SDK
    // Note: Vercel AI SDK doesn't have direct Whisper support yet,
    // so we'll use the OpenAI API directly
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Mock grading function for Phase 0
 * Returns simple keyword-based grading
 */
export function mockGrade(transcript: string, definition: string): {
  grade: "pass" | "almost" | "fail";
  score: number;
  feedback: string;
} {
  const transcriptLower = transcript.toLowerCase();
  const definitionLower = definition.toLowerCase();

  // Extract key words from definition (simple approach)
  const definitionWords = definitionLower
    .split(/\s+/)
    .filter((word) => word.length > 4) // Only meaningful words
    .filter((word) => !["about", "being", "having", "where", "which", "their", "there", "these", "those"].includes(word));

  // Count matching words
  const matches = definitionWords.filter((word) => transcriptLower.includes(word));
  const matchRatio = definitionWords.length > 0 ? matches.length / definitionWords.length : 0;

  // Grade based on match ratio
  if (matchRatio >= 0.6) {
    return {
      grade: "pass",
      score: matchRatio,
      feedback: "Great job! You captured the key meaning.",
    };
  } else if (matchRatio >= 0.3) {
    return {
      grade: "almost",
      score: matchRatio,
      feedback: "You're on the right track, but try to include more key elements of the definition.",
    };
  } else {
    return {
      grade: "fail",
      score: matchRatio,
      feedback: "Let's review the definition together. Focus on the core meaning.",
    };
  }
}
