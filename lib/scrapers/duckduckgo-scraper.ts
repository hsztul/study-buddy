/**
 * DuckDuckGo Dictionary scraper - Tertiary fallback
 * Scrapes dictionary widget from DuckDuckGo search results
 */

import * as cheerio from 'cheerio';
import type { IScraper, ScraperResult, ScrapedWord, ScrapedMeaning } from './scraper-types';

export class DuckDuckGoScraper implements IScraper {
  name = 'DuckDuckGo';
  private baseUrl = 'https://duckduckgo.com/';

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();
    const searchQuery = `define ${normalizedWord}`;
    const url = `${this.baseUrl}?ia=web&origin=funnel_home_website&t=h_&q=${encodeURIComponent(searchQuery)}`;

    try {
      console.log(`[DuckDuckGo] Fetching "${normalizedWord}"...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://duckduckgo.com/',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const scrapedData = this.parseDuckDuckGoHtml(html, normalizedWord);

      if (!scrapedData) {
        return {
          success: false,
          error: 'Could not find dictionary widget in results',
          source: this.name,
        };
      }

      console.log(`[DuckDuckGo] Successfully scraped "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[DuckDuckGo] Error scraping "${normalizedWord}":`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }

  private parseDuckDuckGoHtml(html: string, word: string): ScrapedWord | null {
    const $ = cheerio.load(html);
    const meanings: ScrapedMeaning[] = [];

    // DuckDuckGo uses various selectors for dictionary results
    // Look for dictionary module/widget
    const dictionaryModule = $('.module--dictionary, .dictionary, [data-section="dictionary"]').first();
    
    if (dictionaryModule.length === 0) {
      // Try alternative: look for definition-like content
      const defContainers = $('.definition, .dict-entry, .meaning').first();
      if (defContainers.length === 0) {
        return null;
      }
    }

    // Extract phonetic pronunciation
    let phonetic: string | undefined;
    const phoneticElem = $('.phonetic, .pronunciation, [class*="phonetic"]').first();
    if (phoneticElem.length > 0) {
      phonetic = phoneticElem.text().trim();
    }

    // Method 1: Look for structured definition entries
    $('.dict-entry, .definition-entry, .meaning-entry').each((_, elem) => {
      const $elem = $(elem);
      
      // Get part of speech
      const posElem = $elem.find('.pos, .part-of-speech, [class*="part-of-speech"]');
      const partOfSpeech = posElem.text().trim().toLowerCase() || 'unknown';

      // Get definition text
      const defElem = $elem.find('.definition, .def, [class*="definition"]');
      const defText = defElem.text().trim();

      if (defText) {
        // Check if we already have this part of speech
        let meaning = meanings.find(m => m.partOfSpeech === partOfSpeech);
        if (!meaning) {
          meaning = {
            partOfSpeech,
            definitions: [],
          };
          meanings.push(meaning);
        }

        // Look for example
        const exampleElem = $elem.find('.example, .usage, [class*="example"]');
        const example = exampleElem.text().trim() || undefined;

        meaning.definitions.push({
          definition: defText,
          example,
        });
      }
    });

    // Method 2: Look for list-based definitions (ol/ul li structure)
    if (meanings.length === 0) {
      $('ol li, ul.definitions li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();
        
        if (text && text.length > 10 && text.length < 500) {
          // Try to extract part of speech from text (often in parentheses or italics)
          const posMatch = text.match(/\(([^)]+)\)/);
          const partOfSpeech = posMatch ? posMatch[1].toLowerCase() : 'unknown';
          
          // Remove part of speech from definition
          const defText = text.replace(/\([^)]+\)/, '').trim();

          let meaning = meanings.find(m => m.partOfSpeech === partOfSpeech);
          if (!meaning) {
            meaning = {
              partOfSpeech,
              definitions: [],
            };
            meanings.push(meaning);
          }

          meaning.definitions.push({
            definition: defText,
          });
        }
      });
    }

    // Method 3: Simple fallback - look for any text that looks like a definition
    if (meanings.length === 0) {
      const textBlocks = $('p, div').filter((_, elem) => {
        const text = $(elem).text().trim();
        // Look for definition-like text (not too short, not too long)
        return text.length > 20 && text.length < 500 && 
               !text.includes('©') && 
               !text.includes('Privacy');
      });

      if (textBlocks.length > 0) {
        const definitions: any[] = [];
        textBlocks.slice(0, 3).each((_, elem) => {
          const text = $(elem).text().trim();
          if (text) {
            definitions.push({
              definition: text,
            });
          }
        });

        if (definitions.length > 0) {
          meanings.push({
            partOfSpeech: 'unknown',
            definitions,
          });
        }
      }
    }

    if (meanings.length === 0) {
      return null;
    }

    return {
      word,
      phonetic,
      meanings,
      source: 'duckduckgo',
    };
  }
}
