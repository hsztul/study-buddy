/**
 * Migration Script: Convert word-based schema to card-stack schema
 * 
 * This script:
 * 1. Creates new tables (card_stack, card, user_card)
 * 2. Migrates data from word/user_word to card/user_card
 * 3. Creates SAT Vocabulary stack for each user
 * 4. Updates references in definition, attempt, user_daily_stats tables
 * 
 * Usage: npx tsx scripts/migrate-to-stacks.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Load environment variables
config({ path: '.env.local' });

// Configure Neon for local development
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigration() {
  console.log('🚀 Starting migration to card-stack schema...\n');

  try {
    // Step 1: Create new tables
    console.log('Step 1: Creating new tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_stack (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_protected BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS card_stack_user_id_idx ON card_stack(user_id);`);
    console.log('✅ card_stack table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS card (
        id SERIAL PRIMARY KEY,
        stack_id INT NOT NULL REFERENCES card_stack(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        part_of_speech TEXT,
        source TEXT DEFAULT 'user' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS card_stack_id_idx ON card(stack_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS card_term_idx ON card(term);`);
    console.log('✅ card table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_card (
        user_id TEXT NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,
        card_id INT NOT NULL REFERENCES card(id) ON DELETE CASCADE,
        stack_id INT NOT NULL REFERENCES card_stack(id) ON DELETE CASCADE,
        in_test_queue BOOLEAN DEFAULT FALSE,
        ease REAL DEFAULT 2.5,
        interval_days INT DEFAULT 0,
        due_on DATE,
        stability REAL,
        last_result TEXT,
        streak INT DEFAULT 0,
        has_reviewed BOOLEAN DEFAULT FALSE,
        first_reviewed_at TIMESTAMPTZ,
        last_reviewed_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, card_id)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS user_card_user_id_stack_id_due_on_idx ON user_card(user_id, stack_id, due_on);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS user_card_user_id_has_reviewed_idx ON user_card(user_id, has_reviewed);`);
    console.log('✅ user_card table created\n');

    // Step 2: Create SAT Vocabulary stack for each user
    console.log('Step 2: Creating SAT Vocabulary stacks...');
    const stackResult = await pool.query(`
      INSERT INTO card_stack (user_id, name, is_protected, created_at, updated_at)
      SELECT 
        user_id,
        'SAT Vocabulary' as name,
        TRUE as is_protected,
        created_at,
        created_at as updated_at
      FROM user_profile
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    console.log(`✅ Created ${stackResult.rowCount} SAT Vocabulary stacks\n`);

    // Step 3: Migrate words to cards
    console.log('Step 3: Migrating words to cards...');
    const cardResult = await pool.query(`
      INSERT INTO card (stack_id, term, definition, part_of_speech, source, created_at, updated_at)
      SELECT 
        cs.id as stack_id,
        w.term,
        COALESCE(d.definition, 'Definition pending') as definition,
        w.part_of_speech,
        'sat_base' as source,
        now() as created_at,
        now() as updated_at
      FROM word w
      CROSS JOIN card_stack cs
      LEFT JOIN LATERAL (
        SELECT definition 
        FROM definition 
        WHERE word_id = w.id AND rank = 1 
        LIMIT 1
      ) d ON true
      WHERE cs.is_protected = TRUE
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    console.log(`✅ Migrated ${cardResult.rowCount} cards\n`);

    // Step 4: Migrate user_word to user_card
    console.log('Step 4: Migrating user progress...');
    const userCardResult = await pool.query(`
      INSERT INTO user_card (
        user_id, card_id, stack_id, in_test_queue, ease, interval_days,
        due_on, stability, last_result, streak, has_reviewed,
        first_reviewed_at, last_reviewed_at
      )
      SELECT 
        uw.user_id, c.id, c.stack_id, uw.in_test_queue, uw.ease, uw.interval_days,
        uw.due_on, uw.stability, uw.last_result, uw.streak, uw.has_reviewed,
        uw.first_reviewed_at, uw.last_reviewed_at
      FROM user_word uw
      JOIN word w ON uw.word_id = w.id
      JOIN card c ON c.term = w.term AND c.source = 'sat_base'
      JOIN card_stack cs ON c.stack_id = cs.id AND cs.user_id = uw.user_id AND cs.is_protected = TRUE
      ON CONFLICT DO NOTHING
      RETURNING user_id, card_id;
    `);
    console.log(`✅ Migrated ${userCardResult.rowCount} user card records\n`);

    // Step 5: Update definition table
    console.log('Step 5: Updating definition table...');
    await pool.query(`
      ALTER TABLE definition ADD COLUMN IF NOT EXISTS card_id INT;
    `);
    const defUpdateResult = await pool.query(`
      UPDATE definition d
      SET card_id = c.id
      FROM word w
      JOIN card c ON c.term = w.term AND c.source = 'sat_base'
      WHERE d.word_id = w.id AND d.card_id IS NULL;
    `);
    console.log(`✅ Updated ${defUpdateResult.rowCount} definitions`);
    
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'definition_card_id_fkey'
        ) THEN
          ALTER TABLE definition 
          ADD CONSTRAINT definition_card_id_fkey 
          FOREIGN KEY (card_id) REFERENCES card(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ Added foreign key constraint\n');

    // Step 6: Update attempt table
    console.log('Step 6: Updating attempt table...');
    await pool.query(`
      ALTER TABLE attempt ADD COLUMN IF NOT EXISTS card_id INT;
      ALTER TABLE attempt ADD COLUMN IF NOT EXISTS stack_id INT;
    `);
    const attemptUpdateResult = await pool.query(`
      UPDATE attempt a
      SET card_id = c.id, stack_id = c.stack_id
      FROM word w
      JOIN card c ON c.term = w.term AND c.source = 'sat_base'
      WHERE a.word_id = w.id AND a.card_id IS NULL;
    `);
    console.log(`✅ Updated ${attemptUpdateResult.rowCount} attempts`);
    
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'attempt_card_id_fkey'
        ) THEN
          ALTER TABLE attempt ADD CONSTRAINT attempt_card_id_fkey FOREIGN KEY (card_id) REFERENCES card(id);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'attempt_stack_id_fkey'
        ) THEN
          ALTER TABLE attempt ADD CONSTRAINT attempt_stack_id_fkey FOREIGN KEY (stack_id) REFERENCES card_stack(id);
        END IF;
      END $$;
    `);
    console.log('✅ Added foreign key constraints\n');

    // Step 7: Update user_daily_stats
    console.log('Step 7: Updating user_daily_stats table...');
    await pool.query(`
      ALTER TABLE user_daily_stats ADD COLUMN IF NOT EXISTS stack_id INT;
    `);
    const statsUpdateResult = await pool.query(`
      UPDATE user_daily_stats uds
      SET stack_id = cs.id
      FROM card_stack cs
      WHERE cs.user_id = uds.user_id AND cs.is_protected = TRUE AND uds.stack_id IS NULL;
    `);
    console.log(`✅ Updated ${statsUpdateResult.rowCount} daily stats records`);
    
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'user_daily_stats_stack_id_fkey'
        ) THEN
          ALTER TABLE user_daily_stats 
          ADD CONSTRAINT user_daily_stats_stack_id_fkey 
          FOREIGN KEY (stack_id) REFERENCES card_stack(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ Added foreign key constraint\n');

    // Verification
    console.log('📊 Verification:');
    const stackCount = await pool.query(`SELECT COUNT(*) FROM card_stack WHERE is_protected = TRUE;`);
    console.log(`   - SAT Vocabulary stacks: ${stackCount.rows[0].count}`);
    
    const cardCount = await pool.query(`SELECT COUNT(*) FROM card WHERE source = 'sat_base';`);
    console.log(`   - SAT cards: ${cardCount.rows[0].count}`);
    
    const userCardCount = await pool.query(`SELECT COUNT(*) FROM user_card;`);
    console.log(`   - User card records: ${userCardCount.rows[0].count}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  Next steps:');
    console.log('   1. Verify the data looks correct');
    console.log('   2. Update schema.ts to use the new schema');
    console.log('   3. Update all API routes to use card/stack tables');
    console.log('   4. After everything works, drop old tables: word, user_word');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(console.error);
