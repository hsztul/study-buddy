/**
 * Script to populate definitions for all words in the database
 * Uses Exa scraper to fetch definitions for words that don't have them
 * 
 * Run with: npx tsx scripts/populate-definitions.ts
 */

// MUST be first import to load env vars
import './load-env';

import { db } from '@/lib/db';
import { word, definition } from '@/lib/db/schema';
import { eq, notInArray, sql } from 'drizzle-orm';
import { scraperManager } from '@/lib/scrapers/scraper-manager';

interface Stats {
  totalWords: number;
  wordsWithDefinitions: number;
  wordsWithoutDefinitions: number;
  definitionsAdded: number;
  failed: number;
}

async function populateDefinitions() {
  console.log('🔍 Checking database for words without definitions...\n');

  const stats: Stats = {
    totalWords: 0,
    wordsWithDefinitions: 0,
    wordsWithoutDefinitions: 0,
    definitionsAdded: 0,
    failed: 0,
  };

  try {
    // Get all words
    const allWords = await db.select().from(word);
    stats.totalWords = allWords.length;
    console.log(`📚 Total words in database: ${stats.totalWords}`);

    // Get words that already have definitions
    const wordsWithDefs = await db
      .selectDistinct({ wordId: definition.wordId })
      .from(definition);
    
    const wordIdsWithDefs = new Set(wordsWithDefs.map(w => w.wordId));
    stats.wordsWithDefinitions = wordIdsWithDefs.size;

    // Find words without definitions
    const wordsWithoutDefs = allWords.filter(w => !wordIdsWithDefs.has(w.id));
    stats.wordsWithoutDefinitions = wordsWithoutDefs.length;

    console.log(`✅ Words with definitions: ${stats.wordsWithDefinitions}`);
    console.log(`❌ Words without definitions: ${stats.wordsWithoutDefinitions}\n`);

    if (wordsWithoutDefs.length === 0) {
      console.log('🎉 All words already have definitions!');
      return stats;
    }

    console.log(`🚀 Starting to fetch definitions for ${wordsWithoutDefs.length} words...\n`);

    // Process each word without a definition
    for (let i = 0; i < wordsWithoutDefs.length; i++) {
      const currentWord = wordsWithoutDefs[i];
      const progress = `[${i + 1}/${wordsWithoutDefs.length}]`;

      console.log(`${progress} Fetching definition for "${currentWord.term}"...`);

      try {
        // Fetch definition using scraper manager
        const scrapedData = await scraperManager.fetchDefinition(currentWord.term);

        if (!scrapedData || scrapedData.meanings.length === 0) {
          console.log(`  ⚠️  No definition found for "${currentWord.term}"`);
          stats.failed++;
          continue;
        }

        // Insert definitions into database
        let rank = 1;
        for (const meaning of scrapedData.meanings) {
          for (const def of meaning.definitions) {
            await db.insert(definition).values({
              wordId: currentWord.id,
              definition: def.definition,
              example: def.example || null,
              partOfSpeech: meaning.partOfSpeech,
              phonetic: scrapedData.phonetic || null,
              synonyms: def.synonyms ? JSON.stringify(def.synonyms) : null,
              antonyms: def.antonyms ? JSON.stringify(def.antonyms) : null,
              rank,
              source: scrapedData.source,
            });
            rank++;
          }
        }

        stats.definitionsAdded++;
        console.log(`  ✅ Added ${rank - 1} definition(s) from ${scrapedData.source}`);

        // Small delay to avoid rate limiting
        if (i < wordsWithoutDefs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`  ❌ Error fetching definition for "${currentWord.term}":`, error);
        stats.failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Statistics:');
    console.log('='.repeat(60));
    console.log(`Total words: ${stats.totalWords}`);
    console.log(`Words with definitions (before): ${stats.wordsWithDefinitions}`);
    console.log(`Words without definitions (before): ${stats.wordsWithoutDefinitions}`);
    console.log(`Definitions added: ${stats.definitionsAdded}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Words with definitions (after): ${stats.wordsWithDefinitions + stats.definitionsAdded}`);
    console.log('='.repeat(60));

    return stats;
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

// Run the script
populateDefinitions()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
