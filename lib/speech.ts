/**
 * Text-to-speech utility using API route (server-side OpenAI integration)
 */

export interface SpeechOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export async function generateWordSpeech(
  text: string,
  options: SpeechOptions = {}
): Promise<{ audioData: Uint8Array; mimeType: string }> {
  const { voice = 'alloy', speed = 1.0 } = options;

  try {
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate speech');
    }

    const { audio, mimeType } = await response.json();
    
    // Convert base64 back to Uint8Array
    const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    return {
      audioData,
      mimeType: mimeType || 'audio/mpeg'
    };
  } catch (error) {
    console.error('Speech generation error:', error);
    throw new Error('Failed to generate speech');
  }
}

export async function playSpeechAudio(audioData: Uint8Array, mimeType: string = 'audio/mpeg'): Promise<void> {
  try {
    // Create a blob from the audio data using type assertion
    const blob = new Blob([audioData as BlobPart], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);

    // Create and play audio
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      audio.play().catch(reject);
    });
  } catch (error) {
    console.error('Audio playback error:', error);
    throw new Error('Failed to play speech audio');
  }
}

export async function speakWord(
  text: string,
  options: SpeechOptions = {}
): Promise<void> {
  try {
    const { audioData, mimeType } = await generateWordSpeech(text, options);
    await playSpeechAudio(audioData, mimeType);
  } catch (error) {
    console.error('Speech synthesis error:', error);
    throw error;
  }
}
