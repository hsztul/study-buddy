/**
 * Scraper Manager - Orchestrates multiple scrapers with fallback logic
 */

import { ExaScraper } from './exa-scraper';
import type { IScraper, ScraperResult, ScrapedWord } from './scraper-types';

export class ScraperManager {
  private scrapers: IScraper[];
  private cache: Map<string, { data: ScrapedWord; timestamp: number }>;
  private cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 days (scraped data is stable)

  constructor() {
    // Order matters - will try in sequence
    this.scrapers = [
      new ExaScraper(),  // Primary: AI-powered search with structured output
    ];
    this.cache = new Map();
  }

  /**
   * Fetch definition using available scrapers with fallback logic
   */
  async fetchDefinition(word: string): Promise<ScrapedWord | null> {
    const normalizedWord = word.toLowerCase().trim();

    // Check cache first
    const cached = this.cache.get(normalizedWord);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log(`[ScraperManager] Cache hit for "${normalizedWord}" (source: ${cached.data.source})`);
      return cached.data;
    }

    // Try each scraper in sequence
    for (const scraper of this.scrapers) {
      try {
        console.log(`[ScraperManager] Trying ${scraper.name} for "${normalizedWord}"...`);
        const result = await scraper.scrape(normalizedWord);

        if (result.success && result.data) {
          // Cache successful result
          this.cache.set(normalizedWord, {
            data: result.data,
            timestamp: Date.now(),
          });
          console.log(`[ScraperManager] ✓ Success with ${scraper.name}`);
          return result.data;
        }

        console.log(`[ScraperManager] ✗ ${scraper.name} failed: ${result.error}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[ScraperManager] ✗ ${scraper.name} error:`, errorMsg);
      }

      // Small delay before trying next scraper
      if (this.scrapers.indexOf(scraper) < this.scrapers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.warn(`[ScraperManager] All scrapers failed for "${normalizedWord}"`);
    return null;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ScraperManager] Cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get available scraper names
   */
  getScraperNames(): string[] {
    return this.scrapers.map(s => s.name);
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();
