/**
 * Script to populate definitions for all words in the database
 * Uses Exa scraper to fetch definitions for words that don't have them
 * 
 * Run with: npx tsx scripts/populate-definitions.ts
 */

// MUST be first import to load env vars
import './load-env';

import { db } from '@/lib/db';
import { card, definition } from '@/lib/db/schema';
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
    // Get all cards
    const allCards = await db.select().from(card);
    stats.totalWords = allCards.length;
    console.log(`📚 Total cards in database: ${stats.totalWords}`);

    // Get cards that already have definitions
    const cardsWithDefs = await db
      .selectDistinct({ cardId: definition.cardId })
      .from(definition);
    
    const cardIdsWithDefs = new Set(cardsWithDefs.map(w => w.cardId));
    stats.wordsWithDefinitions = cardIdsWithDefs.size;

    // Find cards without definitions
    const cardsWithoutDefs = allCards.filter(w => !cardIdsWithDefs.has(w.id));
    stats.wordsWithoutDefinitions = cardsWithoutDefs.length;

    console.log(`✅ Cards with definitions: ${stats.wordsWithDefinitions}`);
    console.log(`❌ Cards without definitions: ${stats.wordsWithoutDefinitions}\n`);

    if (cardsWithoutDefs.length === 0) {
      console.log('🎉 All cards already have definitions!');
      return stats;
    }

    console.log(`🚀 Starting to fetch definitions for ${cardsWithoutDefs.length} cards...\n`);

    // Process each card without a definition
    for (let i = 0; i < cardsWithoutDefs.length; i++) {
      const currentCard = cardsWithoutDefs[i];
      const progress = `[${i + 1}/${cardsWithoutDefs.length}]`;

      console.log(`${progress} Fetching definition for "${currentCard.term}"...`);

      try {
        // Fetch definition using scraper manager
        const scrapedData = await scraperManager.fetchDefinition(currentCard.term);

        if (!scrapedData || scrapedData.meanings.length === 0) {
          console.log(`  ⚠️  No definition found for "${currentCard.term}"`);
          stats.failed++;
          continue;
        }

        // Insert definitions into database
        let rank = 1;
        for (const meaning of scrapedData.meanings) {
          for (const def of meaning.definitions) {
            await db.insert(definition).values({
              cardId: currentCard.id,
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
        if (i < cardsWithoutDefs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`  ❌ Error fetching definition for "${currentCard.term}":`, error);
        stats.failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Statistics:');
    console.log('='.repeat(60));
    console.log(`Total cards: ${stats.totalWords}`);
    console.log(`Cards with definitions (before): ${stats.wordsWithDefinitions}`);
    console.log(`Cards without definitions (before): ${stats.wordsWithoutDefinitions}`);
    console.log(`Definitions added: ${stats.definitionsAdded}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Cards with definitions (after): ${stats.wordsWithDefinitions + stats.definitionsAdded}`);
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
