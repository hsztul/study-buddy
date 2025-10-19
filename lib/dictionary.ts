/**
 * Dictionary API client for fetching word definitions
 * Multi-tier caching: In-memory → Database → API
 * Primary: Free Dictionary API (dictionaryapi.dev - fast, free, no API key)
 * Fallback: Exa.ai (AI-powered search with structured output)
 */

import { scraperManager } from './scrapers/scraper-manager';
import type { ScrapedWord } from './scrapers/scraper-types';
import { db, definition, word as wordTable } from './db';
import { eq, sql } from 'drizzle-orm';
import type { Definition } from './db/schema';

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }[];
  }[];
}

export interface SimplifiedDefinition {
  definition: string;
  example?: string;
  partOfSpeech: string;
  rank: number; // 1 = primary, 2+ = alternates
  synonyms?: string[];
  antonyms?: string[];
  phonetic?: string;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days (definitions are stable)

// In-memory cache (L1 cache - fastest)
const memoryCache = new Map<string, { data: DictionaryDefinition[]; timestamp: number }>();

/**
 * Fetch word definition with multi-tier caching
 * L1: In-memory cache (fastest)
 * L2: Database cache (persistent)
 * L3: API scrapers (fallback)
 */
export async function fetchDefinition(
  word: string
): Promise<DictionaryDefinition[] | null> {
  const normalizedWord = word.toLowerCase().trim();

  // L1: Check in-memory cache first
  const memoryCached = memoryCache.get(normalizedWord);
  if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_DURATION) {
    console.log(`[Dictionary] L1 cache hit for "${normalizedWord}"`);
    return memoryCached.data;
  }

  // L2: Check database cache (case-insensitive)
  try {
    const wordRecord = await db.query.word.findFirst({
      where: sql`LOWER(${wordTable.term}) = LOWER(${normalizedWord})`,
      with: {
        definitions: true,
      },
    });

    if (wordRecord?.definitions && wordRecord.definitions.length > 0) {
      const dbDefs = wordRecord.definitions;
      const cachedAt = dbDefs[0]?.cachedAt;
      
      // Check if DB cache is still valid
      if (cachedAt && Date.now() - new Date(cachedAt).getTime() < CACHE_DURATION) {
        console.log(`[Dictionary] L2 (DB) cache hit for "${normalizedWord}"`);
        const converted = convertDbToApiFormat(dbDefs, normalizedWord);
        
        // Store in L1 cache for faster subsequent access
        memoryCache.set(normalizedWord, { data: converted, timestamp: Date.now() });
        return converted;
      }
    }
  } catch (error) {
    console.warn(`[Dictionary] DB cache check failed for "${normalizedWord}":`, error);
    // Continue to API fetch on DB error
  }

  // L3: Fetch from API scrapers
  console.log(`[Dictionary] L3 (API) fetch for "${normalizedWord}"...`);
  const scrapedData = await scraperManager.fetchDefinition(normalizedWord);
  
  if (scrapedData) {
    const converted = convertScrapedToApiFormat(scrapedData);
    
    // Store in L1 cache
    memoryCache.set(normalizedWord, { data: converted, timestamp: Date.now() });
    
    // Store in L2 (database) asynchronously for persistence
    saveDefinitionsToDb(word, scrapedData).catch(err => {
      console.error(`[Dictionary] Failed to save to DB for "${word}":`, err);
    });
    
    console.log(`[Dictionary] Successfully fetched "${normalizedWord}" from ${scrapedData.source}`);
    
    return converted;
  }

  console.error(`[Dictionary] All sources failed for "${normalizedWord}"`);
  return null;
}

/**
 * Save definitions to database for persistent caching
 */
export async function saveDefinitionsToDb(
  wordTerm: string,
  scrapedData: ScrapedWord
): Promise<void> {
  try {
    // Find the word record (case-insensitive search)
    const normalizedTerm = wordTerm.trim();
    const wordRecord = await db.query.word.findFirst({
      where: sql`LOWER(${wordTable.term}) = LOWER(${normalizedTerm})`,
    });

    if (!wordRecord) {
      console.warn(`[Dictionary] Cannot save definitions: word "${wordTerm}" not found in database`);
      return;
    }

    // Delete old cached definitions for this word (if any)
    await db.delete(definition).where(eq(definition.wordId, wordRecord.id));

    // Prepare new definitions
    const newDefinitions: typeof definition.$inferInsert[] = [];
    let rank = 1;

    for (const meaning of scrapedData.meanings) {
      for (const def of meaning.definitions) {
        newDefinitions.push({
          wordId: wordRecord.id,
          definition: def.definition,
          example: def.example || null,
          partOfSpeech: meaning.partOfSpeech,
          phonetic: scrapedData.phonetic || null,
          synonyms: def.synonyms && def.synonyms.length > 0 ? JSON.stringify(def.synonyms) : null,
          antonyms: def.antonyms && def.antonyms.length > 0 ? JSON.stringify(def.antonyms) : null,
          rank,
          source: scrapedData.source,
        });
        rank++;
      }
    }

    // Insert new definitions
    if (newDefinitions.length > 0) {
      await db.insert(definition).values(newDefinitions);
      console.log(`[Dictionary] Saved ${newDefinitions.length} definition(s) to DB for "${wordTerm}"`);
    }
  } catch (error) {
    console.error(`[Dictionary] Failed to save definitions to DB for "${wordTerm}":`, error);
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Convert scraped data format to API format
 */
function convertScrapedToApiFormat(scraped: ScrapedWord): DictionaryDefinition[] {
  return [{
    word: scraped.word,
    phonetic: scraped.phonetic,
    meanings: scraped.meanings.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map(def => ({
        definition: def.definition,
        example: def.example,
        synonyms: def.synonyms || [],
        antonyms: def.antonyms || [],
      })),
    })),
  }];
}

/**
 * Convert database definitions to API format
 */
function convertDbToApiFormat(dbDefs: Definition[], word: string): DictionaryDefinition[] {
  // Group definitions by part of speech
  const meaningMap = new Map<string, typeof dbDefs>();
  
  for (const def of dbDefs) {
    const pos = def.partOfSpeech;
    if (!meaningMap.has(pos)) {
      meaningMap.set(pos, []);
    }
    meaningMap.get(pos)!.push(def);
  }

  // Convert to API format
  const meanings = Array.from(meaningMap.entries()).map(([partOfSpeech, defs]) => ({
    partOfSpeech,
    definitions: defs.map(def => ({
      definition: def.definition,
      example: def.example || undefined,
      synonyms: def.synonyms ? JSON.parse(def.synonyms) : [],
      antonyms: def.antonyms ? JSON.parse(def.antonyms) : [],
    })),
  }));

  return [{
    word,
    phonetic: dbDefs[0]?.phonetic || undefined,
    meanings,
  }];
}

/**
 * Extract simplified definitions from API response
 * Returns primary definition (rank 1) and up to 2 alternates (rank 2-3)
 */
export function extractDefinitions(
  apiData: DictionaryDefinition[]
): SimplifiedDefinition[] {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  const simplified: SimplifiedDefinition[] = [];
  let rank = 1;

  // Process first entry (most relevant)
  const firstEntry = apiData[0];

  for (const meaning of firstEntry.meanings) {
    for (const def of meaning.definitions) {
      if (rank <= 3) {
        // Only keep top 3 definitions
        simplified.push({
          definition: def.definition,
          example: def.example,
          partOfSpeech: meaning.partOfSpeech,
          rank: rank++,
        });
      }
    }
  }

  return simplified;
}

/**
 * Get the primary (shortest, most concise) definition
 */
export function getPrimaryDefinition(
  definitions: SimplifiedDefinition[]
): SimplifiedDefinition | null {
  if (definitions.length === 0) return null;

  // Return the shortest definition as primary (usually most concise)
  return definitions.reduce((shortest, current) =>
    current.definition.length < shortest.definition.length ? current : shortest
  );
}

/**
 * Convenience function: fetch and extract definitions in one call
 */
export async function getWordDefinitions(
  word: string
): Promise<SimplifiedDefinition[]> {
  const apiData = await fetchDefinition(word);
  if (!apiData) return [];
  return extractDefinitions(apiData);
}
