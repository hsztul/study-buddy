/**
 * Google Dictionary scraper - Fallback source
 * Scrapes dictionary widget from Google search results
 */

import * as cheerio from 'cheerio';
import type { IScraper, ScraperResult, ScrapedWord, ScrapedMeaning } from './scraper-types';

export class GoogleScraper implements IScraper {
  name = 'Google';
  private baseUrl = 'https://www.google.com/search';

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();
    const searchQuery = `define ${normalizedWord}`;
    const url = `${this.baseUrl}?q=${encodeURIComponent(searchQuery)}&hl=en`;

    try {
      console.log(`[Google] Fetching "${normalizedWord}"...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const scrapedData = this.parseGoogleHtml(html, normalizedWord);

      if (!scrapedData) {
        return {
          success: false,
          error: 'Could not find dictionary widget in results',
          source: this.name,
        };
      }

      console.log(`[Google] Successfully scraped "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Google] Error scraping "${normalizedWord}":`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }

  private parseGoogleHtml(html: string, word: string): ScrapedWord | null {
    const $ = cheerio.load(html);
    const meanings: ScrapedMeaning[] = [];

    // Google's dictionary widget has various selectors depending on layout
    // Look for dictionary card containers
    const dictionaryCard = $('[data-attrid*="dictionary"]').first();
    
    if (dictionaryCard.length === 0) {
      // Try alternative selectors
      const altCard = $('.lr_container, .thODed').first();
      if (altCard.length === 0) {
        return null;
      }
    }

    // Extract phonetic pronunciation
    let phonetic: string | undefined;
    const phoneticElem = $('[data-dobid="hdw"] span, .PZPZlf span').first();
    if (phoneticElem.length > 0) {
      phonetic = phoneticElem.text().trim();
    }

    // Try to find definitions - Google structures vary
    // Method 1: Look for definition list items
    $('div[data-dobid="dfn"]').each((_, elem) => {
      const $elem = $(elem);
      const defText = $elem.text().trim();
      
      if (defText) {
        // Try to find associated part of speech
        const posElem = $elem.closest('div').find('[data-dobid="pos"]');
        const partOfSpeech = posElem.text().trim().toLowerCase() || 'unknown';

        // Check if we already have this part of speech
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

    // Method 2: Alternative structure - look for sense containers
    if (meanings.length === 0) {
      $('.thODed').each((_, container) => {
        const $container = $(container);
        
        // Get part of speech
        const posElem = $container.find('.YrbPuc, i').first();
        const partOfSpeech = posElem.text().trim().toLowerCase() || 'unknown';

        // Get definitions
        const definitions: any[] = [];
        $container.find('.LTKOO, [data-dobid="dfn"]').each((_, defElem) => {
          const defText = $(defElem).text().trim();
          if (defText && !defText.match(/^(noun|verb|adjective|adverb)/i)) {
            definitions.push({
              definition: defText,
            });
          }
        });

        if (definitions.length > 0) {
          meanings.push({
            partOfSpeech,
            definitions,
          });
        }
      });
    }

    // Method 3: Simple fallback - just grab visible text from dictionary sections
    if (meanings.length === 0) {
      const defSections = $('[jsname], .PZPZlf').filter((_, elem) => {
        const text = $(elem).text();
        return text.length > 20 && text.length < 500;
      });

      if (defSections.length > 0) {
        const definitions: any[] = [];
        defSections.slice(0, 3).each((_, elem) => {
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
      source: 'google',
    };
  }
}
