/**
 * Word import utility
 * Imports SAT vocabulary terms only (no definitions - those are fetched on-demand)
 */

import { db, card, type NewCard } from "./db";
import { eq } from "drizzle-orm";

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { word: string; error: string }[];
}

/**
 * Import words from array with rate limiting
 */
export async function importWords(
  words: string[],
  options: {
    batchSize?: number;
    delayMs?: number;
    source?: string;
    skipExisting?: boolean;
  } = {}
): Promise<ImportResult> {
  const { batchSize = 3, delayMs = 3000, source = "sat_base", skipExisting = true } = options;

  const result: ImportResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`[Import] Starting import of ${words.length} words...`);

  // Process in batches to avoid rate limiting
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    console.log(`[Import] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)}...`);

    await Promise.all(
      batch.map(async (term) => {
        try {
          await importSingleCard(term, source);
          result.success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if it's a "word already exists" error
          if (errorMessage.includes("already exists")) {
            result.skipped++;
          } else {
            console.error(`[Import] Failed to import "${term}":`, errorMessage);
            result.errors.push({ word: term, error: errorMessage });
            result.failed++;
          }
        }
      })
    );

    // Delay between batches to respect rate limits
    if (i + batchSize < words.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`[Import] Complete! Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
  return result;
}

/**
 * Import a single card term (no definitions)
 */
async function importSingleCard(term: string, source: string): Promise<void> {
  const normalizedTerm = term.trim();

  // Check if card already exists
  const existing = await db.query.card.findFirst({
    where: eq(card.term, normalizedTerm),
  });

  if (existing) {
    console.log(`[Import] Card "${normalizedTerm}" already exists (ID: ${existing.id}), skipping...`);
    throw new Error(`Card already exists`); // This will be caught and counted as skipped
  }

  // Insert card (term only, no definitions)
  const [insertedCard] = await db
    .insert(card)
    .values({
      term: normalizedTerm,
      definition: "", // Will be populated when definition is fetched
      partOfSpeech: null, // Will be populated when definition is fetched
      source,
      stackId: 1, // Default to SAT Vocabulary stack
    })
    .returning();

  console.log(`[Import] Inserted card: "${normalizedTerm}" (ID: ${insertedCard.id})`);
}

/**
 * Import from JSON file (for use in API route)
 */
export async function importFromJSON(filePath: string): Promise<ImportResult> {
  const fs = await import("fs/promises");
  const data = await fs.readFile(filePath, "utf-8");
  const words: string[] = JSON.parse(data);

  if (!Array.isArray(words)) {
    throw new Error("JSON file must contain an array of words");
  }

  return importWords(words, {
    batchSize: 50, // Can be much larger now since no API calls
    delayMs: 0, // No delay needed
    skipExisting: true,
  });
}
