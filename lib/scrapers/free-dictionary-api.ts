/**
 * Free Dictionary API scraper - Primary source
 * Uses dictionaryapi.dev - free, no API key required, reliable
 */

import type { IScraper, ScraperResult, ScrapedWord, ScrapedMeaning } from './scraper-types';

export class FreeDictionaryAPI implements IScraper {
  name = 'FreeDictionaryAPI';
  private baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();
    const url = `${this.baseUrl}/${encodeURIComponent(normalizedWord)}`;

    try {
      console.log(`[FreeDictionaryAPI] Fetching "${normalizedWord}"...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Word not found',
            source: this.name,
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const scrapedData = this.parseApiResponse(data, normalizedWord);

      if (!scrapedData) {
        return {
          success: false,
          error: 'Could not parse API response',
          source: this.name,
        };
      }

      console.log(`[FreeDictionaryAPI] Successfully fetched "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[FreeDictionaryAPI] Error fetching "${normalizedWord}":`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }

  private parseApiResponse(data: any[], word: string): ScrapedWord | null {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const firstEntry = data[0];
    const meanings: ScrapedMeaning[] = [];

    // Extract phonetic
    let phonetic: string | undefined;
    if (firstEntry.phonetic) {
      phonetic = firstEntry.phonetic;
    } else if (firstEntry.phonetics && firstEntry.phonetics.length > 0) {
      // Try to find phonetic with audio or just use first one
      const phoneticWithAudio = firstEntry.phonetics.find((p: any) => p.text && p.audio);
      phonetic = phoneticWithAudio?.text || firstEntry.phonetics[0]?.text;
    }

    // Parse meanings
    if (firstEntry.meanings && Array.isArray(firstEntry.meanings)) {
      for (const meaning of firstEntry.meanings) {
        const definitions: any[] = [];

        if (meaning.definitions && Array.isArray(meaning.definitions)) {
          for (const def of meaning.definitions) {
            if (def.definition) {
              definitions.push({
                definition: def.definition,
                example: def.example || undefined,
                synonyms: def.synonyms || undefined,
                antonyms: def.antonyms || undefined,
              });
            }
          }
        }

        if (definitions.length > 0) {
          meanings.push({
            partOfSpeech: meaning.partOfSpeech || 'unknown',
            definitions,
          });
        }
      }
    }

    if (meanings.length === 0) {
      return null;
    }

    return {
      word: firstEntry.word || word,
      phonetic,
      meanings,
      source: 'free-dictionary-api',
    };
  }
}
