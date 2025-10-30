/**
 * Quick test script for LLM scraper - Tests a sample of words
 * This script helps verify the LLM scraper is working before running on full dataset
 * 
 * Run with: npx tsx scripts/test-llm-scraper-sample.ts
 */

// MUST be first import to load env vars
import './load-env';

import { db } from '@/lib/db';
import { word, definition } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LLMLLMScraper } from '@/lib/scrapers/llm-scraper';

// Sample words to test - mix of common and SAT vocabulary
const SAMPLE_WORDS = [
  'abstract',
  'eloquent', 
  'ubiquitous',
  'ephemeral',
  'ambiguous'
];

async function testLLMScraperSample() {
  console.log('🧪 Testing LLM Scraper with sample words...\n');

  const llmScraper = new LLMLLMScraper();
  console.log(`🔧 Using scraper: ${llmScraper.name}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SAMPLE_WORDS.length; i++) {
    const testWord = SAMPLE_WORDS[i];
    const progress = `[${i + 1}/${SAMPLE_WORDS.length}]`;
    
    console.log(`${progress} 🧠 Testing "${testWord}"...`);

    try {
      const startTime = Date.now();
      const result = await llmScraper.scrape(testWord);
      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        successCount++;
        console.log(`  ✅ Success (${duration}ms)`);
        console.log(`     Source: ${result.data.source}`);
        console.log(`     POS: ${result.data.meanings[0]?.partOfSpeech}`);
        console.log(`     Definition: ${result.data.meanings[0]?.definitions[0]?.definition}`);
        
        if (result.data.phonetic) {
          console.log(`     Phonetic: ${result.data.phonetic}`);
        }
        
        if (result.data.meanings[0]?.definitions[0]?.example) {
          console.log(`     Example: ${result.data.meanings[0].definitions[0].example}`);
        }
      } else {
        failCount++;
        console.log(`  ❌ Failed: ${result.error}`);
      }
    } catch (error) {
      failCount++;
      console.error(`  💥 Error:`, error);
    }

    console.log('');
    
    // Small delay between requests
    if (i < SAMPLE_WORDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('='.repeat(50));
  console.log('📊 Sample Test Results:');
  console.log('='.repeat(50));
  console.log(`Total tested: ${SAMPLE_WORDS.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`🎯 Success rate: ${((successCount / SAMPLE_WORDS.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (failCount === 0) {
    console.log('\n🎉 All sample words succeeded! Ready to run full script.');
    console.log('💡 Run: npx tsx scripts/test-llm-scraper.ts');
  } else {
    console.log('\n⚠️  Some words failed. Check the errors above.');
    console.log('💡 Fix issues before running the full script.');
  }
}

// Run the test
testLLMScraperSample()
  .then(() => {
    console.log('\n✨ Sample test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sample test failed:', error);
    process.exit(1);
  });
