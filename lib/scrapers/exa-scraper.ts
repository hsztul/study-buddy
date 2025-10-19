/**
 * Exa.ai scraper - AI-powered search and definition extraction
 * Uses direct fetch to Exa's OpenAI-compatible endpoint with structured output
 */

import type { IScraper, ScraperResult, ScrapedWord } from './scraper-types';

interface ExaDefinitionResponse {
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  partOfSpeech?: string;
}

export class ExaScraper implements IScraper {
  name = 'Exa.ai';
  private apiKey: string | undefined;
  private baseUrl = 'https://api.exa.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.EXA_API_KEY;
    
    if (!this.apiKey) {
      console.warn('[Exa] EXA_API_KEY not found in environment variables');
    }
  }

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();

    // Check if API key is available
    if (!this.apiKey) {
      return {
        success: false,
        error: 'EXA_API_KEY not configured',
        source: this.name,
      };
    }

    try {
      console.log(`[Exa] Fetching "${normalizedWord}" using AI search...`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'exa',
          messages: [
            {
              role: 'user',
              content: `define ${normalizedWord}`,
            },
          ],
          // Exa-specific parameters in extra_body
          extra_body: {
            user_location: 'US',
            output_schema: {
              description: 'Schema describing a word with its definition, example, synonyms, and antonyms',
              type: 'object',
              required: ['definition', 'example', 'synonyms', 'antonyms'],
              additionalProperties: false,
              properties: {
                definition: {
                  type: 'string',
                  description: 'The meaning or explanation of the word',
                },
                example: {
                  type: 'string',
                  description: 'A sentence demonstrating the usage of the word',
                },
                synonyms: {
                  type: 'array',
                  description: 'List of words with similar meanings',
                  items: {
                    type: 'string',
                  },
                },
                antonyms: {
                  type: 'array',
                  description: 'List of words with opposite meanings',
                  items: {
                    type: 'string',
                  },
                },
                partOfSpeech: {
                  type: 'string',
                  description: 'Part of speech (noun, verb, adjective, etc.)',
                },
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Extract the structured output from Exa's response
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Exa response');
      }

      // Parse the JSON response
      let parsedContent: ExaDefinitionResponse;
      try {
        parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      } catch (parseError) {
        console.error('[Exa] Failed to parse content:', content);
        throw new Error('Failed to parse Exa response as JSON');
      }

      // Convert Exa response to our standard format
      const scrapedData: ScrapedWord = {
        word: normalizedWord,
        meanings: [
          {
            partOfSpeech: parsedContent.partOfSpeech || 'unknown',
            definitions: [
              {
                definition: parsedContent.definition,
                example: parsedContent.example || undefined,
                synonyms: parsedContent.synonyms?.length > 0 ? parsedContent.synonyms : undefined,
                antonyms: parsedContent.antonyms?.length > 0 ? parsedContent.antonyms : undefined,
              },
            ],
          },
        ],
        source: 'exa',
      };

      console.log(`[Exa] Successfully fetched "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Exa] Error fetching "${normalizedWord}":`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }
}
