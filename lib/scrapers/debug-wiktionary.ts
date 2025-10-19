/**
 * Debug script to test Wiktionary HTML parsing
 */

import * as cheerio from 'cheerio';

async function debugWiktionary(word: string) {
  const url = `https://en.wiktionary.org/wiki/${word}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log(`\n=== Debugging "${word}" ===\n`);
  
  // Find English section
  const englishHeader = $('#English').parent();
  console.log('English header found:', englishHeader.length > 0);
  
  if (englishHeader.length > 0) {
    console.log('English header tag:', englishHeader.prop('tagName'));
    
    // Try different approaches to find content
    console.log('\nApproach 1: nextUntil h2 + filter h3/h4');
    const posHeaders1 = englishHeader.nextUntil('h2').filter('h3, h4');
    console.log('  Found:', posHeaders1.length);
    
    console.log('\nApproach 2: nextAll until h2 + filter h3');
    const posHeaders2 = englishHeader.nextAll('h3').first().parent();
    console.log('  Found:', posHeaders2.length);
    
    console.log('\nApproach 3: siblings h3');
    const siblings = englishHeader.siblings('h3');
    console.log('  Found:', siblings.length);
    
    console.log('\nLooking at next few siblings:');
    englishHeader.nextAll().slice(0, 10).each((i, elem) => {
      const $elem = $(elem);
      const tag = $elem.prop('tagName');
      const text = $elem.text().trim().substring(0, 50);
      console.log(`  ${i}: <${tag}> ${text}...`);
    });
    
    console.log('\nLooking for ALL h3 elements after English:');
    const allH3 = englishHeader.nextAll('h3');
    console.log(`  Total h3 after English: ${allH3.length}`);
    allH3.slice(0, 5).each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.find('.mw-headline').text().trim();
      console.log(`    H3 ${i+1}: "${text}"`);
    });
    
    console.log('\nLooking for mw-heading elements:');
    const mwHeadings = englishHeader.nextAll('.mw-heading');
    console.log(`  Found: ${mwHeadings.length}`);
    mwHeadings.slice(0, 5).each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      console.log(`    Heading ${i+1}: "${text}"`);
    });
    
    console.log('\nLooking for ordered lists (ol):');
    const ols = englishHeader.nextAll('ol');
    console.log(`  Found: ${ols.length}`);
    ols.slice(0, 2).each((i, elem) => {
      const $elem = $(elem);
      const firstLi = $elem.find('> li').first();
      const text = firstLi.text().trim().substring(0, 80);
      console.log(`    OL ${i+1} first item: "${text}..."`);
    });
  }
}

// Test words
const words = ['hello', 'algorithm'];

async function run() {
  for (const word of words) {
    await debugWiktionary(word);
  }
}

run().catch(console.error);
