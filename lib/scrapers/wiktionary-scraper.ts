/**
 * Wiktionary scraper - Primary dictionary source
 * Scrapes definitions from en.wiktionary.org
 */

import * as cheerio from 'cheerio';
import type { IScraper, ScraperResult, ScrapedWord, ScrapedMeaning } from './scraper-types';

export class WiktionaryScraper implements IScraper {
  name = 'Wiktionary';
  private baseUrl = 'https://en.wiktionary.org/wiki';

  async scrape(word: string): Promise<ScraperResult> {
    const normalizedWord = word.toLowerCase().trim();
    const url = `${this.baseUrl}/${encodeURIComponent(normalizedWord)}`;

    try {
      console.log(`[Wiktionary] Fetching "${normalizedWord}"...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
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

      const html = await response.text();
      const scrapedData = this.parseWiktionaryHtml(html, normalizedWord);

      if (!scrapedData) {
        return {
          success: false,
          error: 'Could not parse definitions',
          source: this.name,
        };
      }

      console.log(`[Wiktionary] Successfully scraped "${normalizedWord}"`);
      return {
        success: true,
        data: scrapedData,
        source: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Wiktionary] Error scraping "${normalizedWord}":`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        source: this.name,
      };
    }
  }

  private parseWiktionaryHtml(html: string, word: string): ScrapedWord | null {
    const $ = cheerio.load(html);
    const meanings: ScrapedMeaning[] = [];

    // Find the English section
    const englishHeader = $('#English').parent();
    if (englishHeader.length === 0) {
      return null;
    }

    // Extract phonetic (IPA)
    let phonetic: string | undefined;
    const ipaSpan = englishHeader.nextAll().find('.IPA').first();
    if (ipaSpan.length > 0) {
      phonetic = ipaSpan.text().trim();
    }

    // Find all part of speech sections using .mw-heading (Wiktionary's new structure)
    const allHeadings = englishHeader.nextAll('.mw-heading');
    
    // Valid part of speech types
    const validPos = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition', 
                      'Conjunction', 'Interjection', 'Article', 'Determiner'];

    allHeadings.each((_, elem) => {
      const $elem = $(elem);
      const headingText = $elem.text().replace('[edit]', '').trim();
      
      // Check if this is a part of speech heading
      if (!validPos.includes(headingText)) return;

      // Find the next ordered list (ol) after this heading
      let defList = $elem.parent().nextAll('ol').first();
      
      // If not found as nextAll, try looking in siblings
      if (defList.length === 0) {
        defList = $elem.nextAll('ol').first();
      }
      
      if (defList.length === 0) return;

      const definitions: any[] = [];
      
      // Parse each definition (li elements)
      defList.find('> li').each((_, li) => {
        const $li = $(li);
        
        // Get definition text (first text node, excluding nested elements)
        const defText = $li
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim()
          .replace(/\s+/g, ' ');

        if (!defText) return;

        // Look for examples (in nested dl/dd or quotes)
        let example: string | undefined;
        const exampleElems = $li.find('dd, .e-example, .h-usage-example, ul li');
        if (exampleElems.length > 0) {
          example = exampleElems.first().text().trim().replace(/\s+/g, ' ');
        }

        definitions.push({
          definition: defText,
          example: example || undefined,
        });
      });

      if (definitions.length > 0) {
        meanings.push({
          partOfSpeech: headingText.toLowerCase(),
          definitions,
        });
      }
    });

    if (meanings.length === 0) {
      return null;
    }

    return {
      word,
      phonetic,
      meanings,
      source: 'wiktionary',
    };
  }
}
