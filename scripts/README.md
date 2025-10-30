# Scripts Directory

This directory contains utility scripts for the Study Buddy application.

## LLM Scraper Scripts

### 1. Test Sample Words (`test-llm-scraper-sample.ts`)
Tests the LLM scraper with a small sample of words to verify it's working correctly before running on the full dataset.

**Usage:**
```bash
npm run scrapers:test-sample
# or
npx tsx scripts/test-llm-scraper-sample.ts
```

**What it does:**
- Tests 5 sample SAT vocabulary words
- Shows detailed output for each word including definitions, examples, and metadata
- Reports success rate and timing
- Recommended first step to verify LLM scraper is working

### 2. Test All Words (`test-llm-scraper.ts`)
Fetches definitions for all words in the database that don't have them using the LLM scraper.

**Usage:**
```bash
npm run scrapers:test-all
# or
npx tsx scripts/test-llm-scraper.ts
```

**What it does:**
- Finds all words in the database without definitions
- Uses LLM scraper to fetch definitions for each word
- Saves definitions to the database with proper metadata
- Shows progress and detailed statistics
- Includes rate limiting (2 seconds between requests) to avoid API limits

### 3. Test Single Word (`test-llm-scraper.ts` with argument)
Tests the LLM scraper with a specific word to debug issues or verify output.

**Usage:**
```bash
npm run scrapers:test-word "eloquent"
# or
npx tsx scripts/test-llm-scraper.ts "eloquent"
```

**What it does:**
- Tests one specific word with the LLM scraper
- Shows detailed output including all definitions, examples, synonyms, etc.
- Useful for debugging or checking word quality

### 4. Populate Definitions (`populate-definitions.ts`)
Original script that uses the scraper manager to populate definitions (can use multiple scrapers).

**Usage:**
```bash
npm run scrapers:populate
# or
npx tsx scripts/populate-definitions.ts
```

**What it does:**
- Uses the scraper manager (which defaults to LLM scraper)
- Similar to test-llm-scraper.ts but uses the manager abstraction
- Includes caching functionality

## Environment Setup

All scripts automatically load environment variables from `.env.local` via the `load-env.ts` script.

Make sure you have:
- `DATABASE_URL` - Your Neon database connection string
- `OPENAI_API_KEY` - Your OpenAI API key for LLM scraper

## Recommended Workflow

1. **Test the LLM scraper first:**
   ```bash
   npm run scrapers:test-sample
   ```

2. **If sample test passes, run full population:**
   ```bash
   npm run scrapers:test-all
   ```

3. **Monitor progress and check for any failures**

4. **For debugging specific words:**
   ```bash
   npm run scrapers:test-word "problematic-word"
   ```

## Database Schema

The scripts work with these tables:
- `word` - Core vocabulary words
- `definition` - Word definitions with metadata (phonetic, synonyms, examples, etc.)

## Rate Limiting

The LLM scraper scripts include built-in rate limiting to avoid hitting OpenAI API limits:
- Sample test: 1 second between requests
- Full test: 2 seconds between requests

## Error Handling

Scripts will continue processing even if individual words fail, and will provide:
- Detailed error messages for failures
- Final statistics showing success/failure rates
- Proper exit codes (0 for success, 1 for failures)
