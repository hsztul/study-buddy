import { generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { GRADER_SYSTEM_PROMPT, createGraderPrompt } from "./prompts/grader-prompt";

// Create OpenAI provider with API key
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Grading result schema
 */
const GradeResultSchema = z.object({
  grade: z.enum(["pass", "almost", "fail"]),
  score: z.number().min(0).max(1),
  missing_key_ideas: z.array(z.string()),
  feedback: z.string(),
});

export type GradeResult = z.infer<typeof GradeResultSchema>;

/**
 * Grade a student's spoken definition using gpt-4o-mini
 * 
 * @param word - The vocabulary word
 * @param canonicalDefinition - The correct definition
 * @param transcript - The student's spoken response
 * @returns Grading result with grade, score, and feedback
 */
export async function gradeDefinition(
  word: string,
  canonicalDefinition: string,
  transcript: string
): Promise<GradeResult> {
  try {
    const isVerbose = process.env.NEXT_PUBLIC_GRADER_VERBOSE === "true";

    if (isVerbose) {
      console.log("[Grader] Input:", { word, canonicalDefinition, transcript });
    }

    // Use Vercel AI SDK with gpt-5-nano and structured output
    const result = await generateObject({
      model: openaiProvider("gpt-5-nano"),
      system: GRADER_SYSTEM_PROMPT,
      prompt: createGraderPrompt(word, canonicalDefinition, transcript),
      schema: GradeResultSchema,
      temperature: 0.3, // Lower temperature for more consistent grading
    });

    if (isVerbose) {
      console.log("[Grader] Structured output:", result.object);
    }

    return result.object;
  } catch (error) {
    console.error("[Grader] Error:", error);
    
    // Fallback to keyword-based grading if AI fails
    console.warn("[Grader] Falling back to keyword-based grading");
    return fallbackGrade(transcript, canonicalDefinition);
  }
}

/**
 * Fallback grading using keyword matching
 * Used when AI grading fails
 */
function fallbackGrade(transcript: string, definition: string): GradeResult {
  const transcriptLower = transcript.toLowerCase();
  const definitionLower = definition.toLowerCase();

  // Extract key words from definition
  const definitionWords = definitionLower
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .filter(
      (word) =>
        !["about", "being", "having", "where", "which", "their", "there", "these", "those"].includes(
          word
        )
    );

  // Count matching words
  const matches = definitionWords.filter((word) => transcriptLower.includes(word));
  const matchRatio = definitionWords.length > 0 ? matches.length / definitionWords.length : 0;

  // Grade based on match ratio
  if (matchRatio >= 0.6) {
    return {
      grade: "pass",
      score: matchRatio,
      missing_key_ideas: [],
      feedback: "Great job! You captured the key meaning.",
    };
  } else if (matchRatio >= 0.3) {
    const missing = definitionWords.filter((word) => !transcriptLower.includes(word)).slice(0, 2);
    return {
      grade: "almost",
      score: matchRatio,
      missing_key_ideas: missing,
      feedback: "You're on the right track. Try to include more key elements.",
    };
  } else {
    return {
      grade: "fail",
      score: matchRatio,
      missing_key_ideas: definitionWords.slice(0, 3),
      feedback: "Let's review the definition together. Focus on the core meaning.",
    };
  }
}
