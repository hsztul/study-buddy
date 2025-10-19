/**
 * Test script for dictionary scrapers
 * Run with: npx tsx lib/scrapers/test-scrapers.ts
 */

import { scraperManager } from './scraper-manager';
import { getWordDefinitions } from '../dictionary';

async function testWord(word: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing word: "${word}"`);
  console.log('='.repeat(60));

  try {
    // Test the integrated dictionary function
    const definitions = await getWordDefinitions(word);
    
    if (definitions.length > 0) {
      console.log(`\n✓ Found ${definitions.length} definition(s):`);
      definitions.forEach((def, i) => {
        console.log(`\n${i + 1}. [${def.partOfSpeech}] ${def.definition}`);
        if (def.example) {
          console.log(`   Example: "${def.example}"`);
        }
      });
    } else {
      console.log('\n✗ No definitions found');
    }
  } catch (error) {
    console.error('\n✗ Error:', error);
  }
}

async function runTests() {
  console.log('🧪 Testing Dictionary Scrapers\n');
  console.log('Available scrapers:', scraperManager.getScraperNames().join(', '));

  // Test with various words
  const testWords = [
    'hello',       // Simple common word
    'ephemeral',   // More complex word
    'serendipity', // Beautiful word
    'algorithm',   // Technical term
  ];

  for (const word of testWords) {
    await testWord(word);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests complete! Cache size: ${scraperManager.getCacheSize()}`);
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
