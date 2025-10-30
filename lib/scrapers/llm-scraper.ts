/**
 * LLM scraper - Uses OpenAI's gpt-5-nano model for word definitions
 * Leverages Vercel AI SDK for structured output
 */

import { openai, createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { LLM_SCRAPER_PROMPT } from '../prompts/llm-scraper-prompt';
import type { IScraper, ScraperResult, ScrapedWord, ScrapedMeaning, ScrapedDefinition } from './scraper-types';

// Create OpenAI provider with API key
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for structured LLM output - simplified for better reliability
const wordDefinitionSchema = z.object({
  definition: z.string().describe('The primary meaning or explanation of the word'),
  partOfSpeech: z.string().describe('Part of speech (noun, verb, adjective, etc.)'),
  example: z.string().describe('A sentence demonstrating the usage of the word'),
  synonyms: z.array(z.string()).describe('List of words with similar meanings (empty array if none)'),
  antonyms: z.array(z.string()).describe('List of words with opposite meanings (empty array if none)'),
  phonetic: z.string().describe('Phonetic pronunciation guide (empty string if unknown)'),
  etymology: z.string().describe('Brief origin or history of the word (empty string if unknown)'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level of the word'),
});

export class LLMLLMScraper implements IScraper {
  name = 'LLM (gpt-5-nano)';
  private model = openaiProvider('gpt-5-nano'); // Try with gpt-4o-mini as fallback

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();

    try {
      console.log(`[LLMScraper] Fetching "${normalizedWord}" using ${this.model.modelId}...`);

      const prompt = LLM_SCRAPER_PROMPT(normalizedWord);

      const result = await generateObject({
        model: this.model,
        prompt: prompt,
        schema: wordDefinitionSchema
      });

      const llmData = result.object;
      console.log(`[LLMScraper] Raw LLM response for "${normalizedWord}":`, JSON.stringify(llmData, null, 2));

      // Validate required fields
      if (!llmData.definition || !llmData.partOfSpeech) {
        throw new Error(`Invalid LLM response: missing required fields. Definition: ${!!llmData.definition}, PartOfSpeech: ${!!llmData.partOfSpeech}`);
      }

      // Convert LLM response to our standard format
      const scrapedData: ScrapedWord = {
        word: normalizedWord,
        phonetic: llmData.phonetic || undefined,
        meanings: [
          {
            partOfSpeech: llmData.partOfSpeech,
            definitions: [
              {
                definition: llmData.definition,
                example: llmData.example || undefined,
                synonyms: llmData.synonyms?.length ? llmData.synonyms : undefined,
                antonyms: llmData.antonyms?.length ? llmData.antonyms : undefined,
              },
            ],
          },
        ],
        source: 'llm-gpt-5-nano',
      };

      console.log(`[LLMScraper] Successfully fetched "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[LLMScraper] Error fetching "${normalizedWord}":`, errorMsg);
      
      // Add more detailed error information
      if (error instanceof Error && error.message.includes('No object generated')) {
        console.error(`[LLMScraper] This usually means the LLM response couldn't be parsed according to the schema`);
      }
      
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }
}
