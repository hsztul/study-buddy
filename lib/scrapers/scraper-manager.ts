/**
 * Scraper Manager - Orchestrates LLM-based definition fetching
 */

import { LLMLLMScraper } from './llm-scraper';
import type { IScraper, ScraperResult, ScrapedWord } from './scraper-types';

export class ScraperManager {
  private scraper: LLMLLMScraper;
  private cache: Map<string, { data: ScrapedWord; timestamp: number }>;
  private cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 days (definitions are stable)

  constructor() {
    // Use only LLM scraper for consistent, high-quality definitions
    this.scraper = new LLMLLMScraper();
    this.cache = new Map();
  }

  /**
   * Fetch definition using LLM scraper
   */
  async fetchDefinition(word: string): Promise<ScrapedWord | null> {
    const normalizedWord = word.toLowerCase().trim();

    // Check cache first
    const cached = this.cache.get(normalizedWord);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log(`[ScraperManager] Cache hit for "${normalizedWord}" (source: ${cached.data.source})`);
      return cached.data;
    }

    // Use LLM scraper
    try {
      console.log(`[ScraperManager] Using LLM scraper for "${normalizedWord}"...`);
      const result = await this.scraper.scrape(normalizedWord);

      if (result.success && result.data) {
        // Cache successful result
        this.cache.set(normalizedWord, {
          data: result.data,
          timestamp: Date.now(),
        });
        console.log(`[ScraperManager] ✓ Success with LLM scraper`);
        return result.data;
      }

      console.log(`[ScraperManager] ✗ LLM scraper failed: ${result.error}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ScraperManager] ✗ LLM scraper error:`, errorMsg);
    }

    console.warn(`[ScraperManager] LLM scraper failed for "${normalizedWord}"`);
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
    return [this.scraper.name];
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();
