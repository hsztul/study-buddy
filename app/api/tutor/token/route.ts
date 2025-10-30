import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { word, userWord, attempt } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/tutor/token
 * 
 * Generates an ephemeral client token for the OpenAI Realtime API.
 * This token is used by the client-side RealtimeSession to establish
 * a secure WebRTC connection to the Realtime API.
 * 
 * Architecture:
 * - Backend: Generates ephemeral token with session configuration
 * - Client: Uses RealtimeAgent and RealtimeSession classes to connect
 * 
 * @see https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Fetch user's reviewed and tested words for personalized tutoring
    const reviewedWords = await db
      .select({
        term: word.term,
        partOfSpeech: word.partOfSpeech,
      })
      .from(userWord)
      .innerJoin(word, eq(userWord.wordId, word.id))
      .where(and(
        eq(userWord.userId, userId),
        eq(userWord.hasReviewed, true)
      ));

    const testedWords = await db
      .select({
        term: word.term,
        partOfSpeech: word.partOfSpeech,
        grade: attempt.grade,
        score: attempt.score,
      })
      .from(attempt)
      .innerJoin(word, eq(attempt.wordId, word.id))
      .where(and(
        eq(attempt.userId, userId),
        eq(attempt.mode, 'test')
      ))
      .orderBy(attempt.createdAt)
      .limit(50); // Limit to recent tests for context

    // Prepare user context for the tutor
    const userContext = {
      reviewed: reviewedWords.map(w => w.term),
      tested: testedWords.map(w => ({
        term: w.term,
        partOfSpeech: w.partOfSpeech,
        lastGrade: w.grade,
        lastScore: w.score
      })),
      totals: {
        reviewed: reviewedWords.length,
        tested: testedWords.length
      }
    };

    // Build personalized instructions for the tutor
    const instructions = buildTutorInstructions(userContext);

    // Generate ephemeral token for OpenAI Realtime API
    // This follows the pattern from the OpenAI Agents SDK documentation
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime', // Model name as per documentation
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return NextResponse.json(
        { error: 'Failed to create realtime session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the ephemeral token (starts with "ek_") and user context
    // The client will use this token with RealtimeSession.connect({ apiKey })
    return NextResponse.json({
      apiKey: data.value,
      userContext,
      instructions,
    });

  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create session',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Builds personalized tutor instructions based on user's learning progress
 */
function buildTutorInstructions(userContext: {
  reviewed: string[];
  tested: Array<{ term: string; partOfSpeech: string | null; lastGrade: string | null; lastScore: number | null }>;
  totals: { reviewed: number; tested: number };
}): string {
  const baseInstructions = `You are a helpful and encouraging vocabulary tutor. Your goal is to help the user learn and master vocabulary words through interactive dialogue.`;

  if (userContext.totals.reviewed === 0 && userContext.totals.tested === 0) {
    return `${baseInstructions}

The user is just getting started with their vocabulary learning journey. Welcome them warmly and help them begin learning new words.`;
  }

  const contextInstructions = `${baseInstructions}

User's Learning Progress:
- Reviewed words: ${userContext.totals.reviewed}
- Tested words: ${userContext.totals.tested}

${userContext.totals.reviewed > 0 ? `Words the user has reviewed: ${userContext.reviewed.slice(0, 20).join(', ')}${userContext.reviewed.length > 20 ? '...' : ''}` : ''}

${userContext.tested.length > 0 ? `Recent test performance:
${userContext.tested.slice(0, 10).map(w => `- ${w.term} (${w.partOfSpeech || 'unknown'}): ${w.lastGrade || 'not graded'}`).join('\n')}` : ''}

Teaching Guidelines:
- Help the user practice and reinforce words they've already reviewed
- Focus on words where they struggled in tests (lower grades)
- Use the words in context and provide examples
- Ask questions to test understanding
- Be patient, encouraging, and adaptive to their learning style
- Suggest review strategies for difficult words`;

  return contextInstructions;
}
