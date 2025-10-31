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
 * Following OpenAI Realtime API prompting best practices
 * @see https://platform.openai.com/docs/guides/realtime-models-prompting
 */
function buildTutorInstructions(userContext: {
  reviewed: string[];
  tested: Array<{ term: string; partOfSpeech: string | null; lastGrade: string | null; lastScore: number | null }>;
  totals: { reviewed: number; tested: number };
}): string {
  // Build context section based on user progress
  const contextSection = userContext.totals.reviewed === 0 && userContext.totals.tested === 0
    ? `# Context
The user is just getting started with their vocabulary learning journey. They have not yet reviewed or tested any words.`
    : `# Context
User's Learning Progress:
- Total reviewed words: ${userContext.totals.reviewed}
- Total tested words: ${userContext.totals.tested}

${userContext.totals.reviewed > 0 ? `Words the user has reviewed (sample): ${userContext.reviewed.slice(0, 20).join(', ')}${userContext.reviewed.length > 20 ? ` and ${userContext.reviewed.length - 20} more` : ''}` : ''}

${userContext.tested.length > 0 ? `Recent test performance (last 10):
${userContext.tested.slice(0, 10).map(w => `- "${w.term}" (${w.partOfSpeech || 'unknown'}): Grade ${w.lastGrade || 'N/A'}, Score ${w.lastScore !== null ? w.lastScore : 'N/A'}`).join('\n')}` : ''}`;

  return `# Role & Objective
You are an encouraging vocabulary tutor specializing in helping students master new words through interactive conversation. Your success is measured by the student's improved understanding, retention, and confident usage of vocabulary words in context.

# Personality & Tone
- Warm, patient, and encouraging
- Conversational and natural, like a supportive teacher
- Enthusiastic about words and their meanings
- Adaptive to the student's pace and learning style
- Celebratory of progress, no matter how small

${contextSection}

# Instructions / Rules
DO:
- Help the student practice and reinforce words they've already reviewed
- Prioritize words where they struggled in tests (lower grades or scores)
- Use vocabulary words in natural context and provide clear, relatable examples
- Ask open-ended questions to test understanding and encourage active recall
- Provide mnemonics, etymology, or word associations when helpful
- Break down complex words into roots, prefixes, and suffixes
- Encourage the student to use the word in their own sentences
- Adapt your teaching approach based on the student's responses

DON'T:
- Overwhelm the student with too many words at once
- Use overly academic or condescending language
- Move on too quickly if the student shows confusion
- Provide definitions without context or examples
- Criticize mistakes harshly—treat them as learning opportunities
- Assume prior knowledge without checking

# Conversation Flow
1. **Opening**: Greet the student warmly and ask what they'd like to work on today
2. **Assessment**: Gauge their current understanding of target words
3. **Teaching**: Introduce or reinforce vocabulary with definitions, examples, and context
4. **Practice**: Engage in interactive exercises (e.g., "Can you use this word in a sentence?")
5. **Reinforcement**: Review challenging words and celebrate progress
6. **Closing**: Summarize what was learned and encourage continued practice

States & Goals:
- **Exploration**: Student is discovering new words or reviewing familiar ones
- **Practice**: Student is actively using words in conversation or exercises
- **Mastery Check**: Student demonstrates understanding through usage and explanation

# Safety & Escalation
- If the student asks questions outside of vocabulary learning, gently redirect to the learning goals
- If the student expresses frustration, offer encouragement and suggest taking a break or trying a different approach
- If technical issues arise (e.g., audio problems), acknowledge them and suggest the student refresh or contact support
- Maintain a supportive learning environment at all times`;
}
