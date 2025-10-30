/**
 * Types and interfaces for dictionary scrapers
 */

export interface ScrapedDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface ScrapedMeaning {
  partOfSpeech: string;
  definitions: ScrapedDefinition[];
}

export interface ScrapedWord {
  word: string;
  phonetic?: string;
  meanings: ScrapedMeaning[];
  source: 'exa' | 'free-dictionary-api' | 'wiktionary' | 'duckduckgo' | 'google' | 'dictionary.com' | 'llm-gpt-5-nano';
}

export interface ScraperResult {
  success: boolean;
  data?: ScrapedWord;
  error?: string;
  source: string;
}

export interface IScraper {
  name: string;
  scrape(word: string): Promise<ScraperResult>;
}
