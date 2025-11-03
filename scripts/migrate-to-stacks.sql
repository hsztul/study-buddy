-- Migration Script: Convert word-based schema to card-stack schema
-- This script will:
-- 1. Create new tables (card_stack, card, user_card)
-- 2. Migrate data from word/user_word to card/user_card
-- 3. Create SAT Vocabulary stack for each user
-- 4. Drop old tables

-- Note: Run this via Neon MCP or psql

BEGIN;

-- Step 1: Create new tables
CREATE TABLE IF NOT EXISTS card_stack (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_protected BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS card_stack_user_id_idx ON card_stack(user_id);

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

CREATE INDEX IF NOT EXISTS card_stack_id_idx ON card(stack_id);
CREATE INDEX IF NOT EXISTS card_term_idx ON card(term);

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

CREATE INDEX IF NOT EXISTS user_card_user_id_stack_id_due_on_idx ON user_card(user_id, stack_id, due_on);
CREATE INDEX IF NOT EXISTS user_card_user_id_has_reviewed_idx ON user_card(user_id, has_reviewed);

-- Step 2: Create SAT Vocabulary stack for each user
INSERT INTO card_stack (user_id, name, is_protected, created_at, updated_at)
SELECT 
  user_id,
  'SAT Vocabulary' as name,
  TRUE as is_protected,
  created_at,
  created_at as updated_at
FROM user_profile
ON CONFLICT DO NOTHING;

-- Step 3: Migrate words to cards in SAT Vocabulary stack
-- For each user's stack, create cards from existing words
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
ON CONFLICT DO NOTHING;

-- Step 4: Migrate user_word data to user_card
-- This preserves user progress for SAT vocab cards
INSERT INTO user_card (
  user_id, 
  card_id, 
  stack_id,
  in_test_queue,
  ease,
  interval_days,
  due_on,
  stability,
  last_result,
  streak,
  has_reviewed,
  first_reviewed_at,
  last_reviewed_at
)
SELECT 
  uw.user_id,
  c.id as card_id,
  c.stack_id,
  uw.in_test_queue,
  uw.ease,
  uw.interval_days,
  uw.due_on,
  uw.stability,
  uw.last_result,
  uw.streak,
  uw.has_reviewed,
  uw.first_reviewed_at,
  uw.last_reviewed_at
FROM user_word uw
JOIN word w ON uw.word_id = w.id
JOIN card c ON c.term = w.term AND c.source = 'sat_base'
JOIN card_stack cs ON c.stack_id = cs.id AND cs.user_id = uw.user_id AND cs.is_protected = TRUE
ON CONFLICT DO NOTHING;

-- Step 5: Update definition table to reference card instead of word
-- First, add card_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'definition' AND column_name = 'card_id'
  ) THEN
    ALTER TABLE definition ADD COLUMN card_id INT;
  END IF;
END $$;

-- Update existing definitions to reference cards
UPDATE definition d
SET card_id = c.id
FROM word w
JOIN card c ON c.term = w.term AND c.source = 'sat_base'
WHERE d.word_id = w.id AND d.card_id IS NULL;

-- Add foreign key constraint
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

-- Step 6: Update attempt table to reference card and stack
-- Add new columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attempt' AND column_name = 'card_id'
  ) THEN
    ALTER TABLE attempt ADD COLUMN card_id INT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attempt' AND column_name = 'stack_id'
  ) THEN
    ALTER TABLE attempt ADD COLUMN stack_id INT;
  END IF;
END $$;

-- Update existing attempts
UPDATE attempt a
SET 
  card_id = c.id,
  stack_id = c.stack_id
FROM word w
JOIN card c ON c.term = w.term AND c.source = 'sat_base'
WHERE a.word_id = w.id AND a.card_id IS NULL;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attempt_card_id_fkey'
  ) THEN
    ALTER TABLE attempt 
    ADD CONSTRAINT attempt_card_id_fkey 
    FOREIGN KEY (card_id) REFERENCES card(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attempt_stack_id_fkey'
  ) THEN
    ALTER TABLE attempt 
    ADD CONSTRAINT attempt_stack_id_fkey 
    FOREIGN KEY (stack_id) REFERENCES card_stack(id);
  END IF;
END $$;

-- Step 7: Update user_daily_stats to be per-stack
-- Add stack_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_daily_stats' AND column_name = 'stack_id'
  ) THEN
    ALTER TABLE user_daily_stats ADD COLUMN stack_id INT;
  END IF;
END $$;

-- Assign all existing stats to SAT Vocabulary stack
UPDATE user_daily_stats uds
SET stack_id = cs.id
FROM card_stack cs
WHERE cs.user_id = uds.user_id 
  AND cs.is_protected = TRUE 
  AND uds.stack_id IS NULL;

-- Add foreign key constraint
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

-- Step 8: Drop old columns and tables (CAREFUL!)
-- Uncomment these lines after verifying the migration worked correctly

-- ALTER TABLE definition DROP COLUMN IF EXISTS word_id;
-- ALTER TABLE attempt DROP COLUMN IF EXISTS word_id;
-- DROP TABLE IF EXISTS user_word CASCADE;
-- DROP TABLE IF EXISTS word CASCADE;

COMMIT;

-- Verification queries (run these after migration):
-- SELECT COUNT(*) FROM card_stack WHERE is_protected = TRUE; -- Should equal user count
-- SELECT COUNT(*) FROM card WHERE source = 'sat_base'; -- Should equal word count * user count
-- SELECT COUNT(*) FROM user_card; -- Should equal user_word count
-- SELECT * FROM card_stack LIMIT 5;
-- SELECT * FROM card LIMIT 5;
-- SELECT * FROM user_card LIMIT 5;
