/**
 * Test script for LLM scraper - Fetches definitions for all words using LLM
 * This script specifically tests the LLM scraper functionality
 * 
 * Run with: npx tsx scripts/test-llm-scraper.ts
 */

// MUST be first import to load env vars
import './load-env';

import { db } from '@/lib/db';
import { card, definition } from '@/lib/db/schema';
import { eq, notInArray, sql } from 'drizzle-orm';
import { LLMLLMScraper } from '@/lib/scrapers/llm-scraper';
import type { ScrapedWord } from '@/lib/scrapers/scraper-types';

interface TestStats {
  totalWords: number;
  wordsWithDefinitions: number;
  wordsWithoutDefinitions: number;
  definitionsAdded: number;
  failed: number;
  skipped: number;
}

async function testLLMScraper() {
  console.log('🧠 Testing LLM Scraper for word definitions...\n');

  const stats: TestStats = {
    totalWords: 0,
    wordsWithDefinitions: 0,
    wordsWithoutDefinitions: 0,
    definitionsAdded: 0,
    failed: 0,
    skipped: 0,
  };

  // Initialize LLM scraper
  const llmScraper = new LLMLLMScraper();
  console.log(`🔧 Initialized scraper: ${llmScraper.name}\n`);

  try {
    // Get all cards from database
    const allCards = await db.select().from(card);
    stats.totalWords = allCards.length;
    console.log(`📚 Total cards in database: ${stats.totalWords}`);

    // Get cards that already have definitions from any source
    const cardsWithDefs = await db
      .selectDistinct({ cardId: definition.cardId })
      .from(definition);
    
    const cardIdsWithDefs = new Set(cardsWithDefs.map(w => w.cardId));
    stats.wordsWithDefinitions = cardIdsWithDefs.size;

    // Filter cards without definitions
    const cardsWithoutDefs = allCards.filter(w => !cardIdsWithDefs.has(w.id));
    stats.wordsWithoutDefinitions = cardsWithoutDefs.length;

    console.log(`✅ Cards already have definitions: ${stats.wordsWithDefinitions}`);
    console.log(`❌ Cards needing definitions: ${stats.wordsWithoutDefinitions}\n`);

    if (cardsWithoutDefs.length === 0) {
      console.log('🎉 All cards already have definitions!');
      return stats;
    }

    console.log(`🚀 Starting LLM scraper for ${cardsWithoutDefs.length} cards...\n`);

    // Process each card without a definition
    for (let i = 0; i < cardsWithoutDefs.length; i++) {
      const currentCard = cardsWithoutDefs[i];
      const progress = `[${i + 1}/${cardsWithoutDefs.length}]`;

      console.log(`${progress} 🧠 Testing LLM scraper for "${currentCard.term}"...`);

      try {
        // Use LLM scraper directly
        const scraperResult = await llmScraper.scrape(currentCard.term);

        if (!scraperResult.success || !scraperResult.data) {
          console.log(`  ❌ LLM scraper failed: ${scraperResult.error}`);
          stats.failed++;
          continue;
        }

        const scrapedData: ScrapedWord = scraperResult.data;
        console.log(`  ✅ LLM scraper succeeded from ${scrapedData.source}`);
        console.log(`     POS: ${scrapedData.meanings[0]?.partOfSpeech}`);
        console.log(`     Definition: ${scrapedData.meanings[0]?.definitions[0]?.definition?.substring(0, 100)}...`);

        // Insert the scraped definitions into database
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
        console.log(`  💾 Saved ${rank - 1} definition(s) to database`);

        // Add delay to avoid rate limiting with OpenAI API
        if (i < cardsWithoutDefs.length - 1) {
          const delay = 2000; // 2 seconds between requests
          console.log(`  ⏳ Waiting ${delay/1000}s before next request...\n`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`  💥 Error processing "${currentCard.term}":`, error);
        stats.failed++;
      }
    }

    // Final statistics
    console.log('\n' + '='.repeat(70));
    console.log('📊 LLM Scraper Test Results:');
    console.log('='.repeat(70));
    console.log(`Total cards in database: ${stats.totalWords}`);
    console.log(`Cards with definitions (before): ${stats.wordsWithDefinitions}`);
    console.log(`Cards processed by LLM scraper: ${stats.wordsWithoutDefinitions}`);
    console.log(`✅ Definitions added: ${stats.definitionsAdded}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`Cards with definitions (after): ${stats.wordsWithDefinitions + stats.definitionsAdded}`);
    console.log('='.repeat(70));

    // Success rate
    const successRate = stats.wordsWithoutDefinitions > 0 
      ? ((stats.definitionsAdded / stats.wordsWithoutDefinitions) * 100).toFixed(1)
      : '100.0';
    console.log(`🎯 Success rate: ${successRate}%`);

    return stats;

  } catch (error) {
    console.error('💥 Fatal error in LLM scraper test:', error);
    throw error;
  }
}

// Test a single word function
async function testSingleWord(testWord: string) {
  console.log(`🧪 Testing single word: "${testWord}"\n`);
  
  const llmScraper = new LLMLLMScraper();
  
  try {
    const result = await llmScraper.scrape(testWord);
    
    if (result.success && result.data) {
      console.log('✅ Success!');
      console.log(`Source: ${result.data.source}`);
      console.log(`Phonetic: ${result.data.phonetic || 'N/A'}`);
      
      for (const meaning of result.data.meanings) {
        console.log(`\nPart of Speech: ${meaning.partOfSpeech}`);
        for (let i = 0; i < meaning.definitions.length; i++) {
          const def = meaning.definitions[i];
          console.log(`  ${i + 1}. ${def.definition}`);
          if (def.example) {
            console.log(`     Example: ${def.example}`);
          }
          if (def.synonyms && def.synonyms.length > 0) {
            console.log(`     Synonyms: ${def.synonyms.join(', ')}`);
          }
        }
      }
    } else {
      console.log('❌ Failed!');
      console.log(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // If a specific word is provided, test just that word
  if (args.length > 0) {
    await testSingleWord(args[0]);
    return;
  }
  
  // Otherwise, test all words without definitions
  const stats = await testLLMScraper();
  
  if (stats.failed > 0) {
    console.log(`\n⚠️  ${stats.failed} words failed. Check logs above for details.`);
    process.exit(1);
  } else {
    console.log('\n✨ LLM scraper test completed successfully!');
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});
