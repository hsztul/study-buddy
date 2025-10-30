import { experimental_generateSpeech as generateSpeech } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';

// Create OpenAI provider with API key (server-side only)
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[Speech API] OPENAI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Speech service not configured' },
        { status: 500 }
      );
    }

    const result = await generateSpeech({
      model: openaiProvider.speech('gpt-4o-mini-tts'),
      text: text.trim(),
      voice,
      ...(speed && speed !== 1.0 && { speed }),
    });

    const { uint8Array, mimeType } = result.audio;

    // Return the audio data as base64
    const base64Audio = Buffer.from(uint8Array).toString('base64');
    
    return NextResponse.json({
      audio: base64Audio,
      mimeType: mimeType || 'audio/mpeg'
    });

  } catch (error) {
    console.error('[Speech API] Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
