import { pgTable, text, serial, integer, real, boolean, timestamp, date, bigserial, smallint, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users are managed by Clerk; we store profile + denormalized stats
export const userProfile = pgTable("user_profile", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Core vocabulary words
export const word = pgTable("word", {
  id: serial("id").primaryKey(),
  term: text("term").notNull().unique(),
  partOfSpeech: text("part_of_speech"),
  source: text("source").default("sat_base"),
});

// Word definitions - cached from dictionary API with full metadata
export const definition = pgTable("definition", {
  id: serial("id").primaryKey(),
  wordId: integer("word_id").notNull().references(() => word.id, { onDelete: "cascade" }),
  definition: text("definition").notNull(),
  example: text("example"),
  partOfSpeech: text("part_of_speech").notNull(),
  phonetic: text("phonetic"),
  synonyms: text("synonyms"), // JSON array stored as text
  antonyms: text("antonyms"), // JSON array stored as text
  rank: smallint("rank").notNull().default(1), // 1 = primary, 2+ = alternates
  source: text("source").notNull().default("free-dictionary-api"), // 'free-dictionary-api' | 'exa' | etc
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
}, (table) => ({
  wordIdRankIdx: index("definition_word_id_rank_idx").on(table.wordId, table.rank),
}));

// User-specific word mastery tracking (spaced repetition + accuracy)
export const userWord = pgTable("user_word", {
  userId: text("user_id").notNull().references(() => userProfile.userId, { onDelete: "cascade" }),
  wordId: integer("word_id").notNull().references(() => word.id, { onDelete: "cascade" }),
  inTestQueue: boolean("in_test_queue").default(false),
  ease: real("ease").default(2.5), // For future SR algorithms
  intervalDays: integer("interval_days").default(0),
  dueOn: date("due_on"),
  stability: real("stability"), // Reserved for FSRS
  lastResult: text("last_result"), // 'pass' | 'fail' | 'almost'
  streak: integer("streak").default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.wordId] }),
  userIdDueOnIdx: index("user_word_user_id_due_on_idx").on(table.userId, table.dueOn),
}));

// Individual test attempts
export const attempt = pgTable("attempt", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull().references(() => userProfile.userId),
  wordId: integer("word_id").notNull().references(() => word.id),
  mode: text("mode").notNull(), // 'test' | 'review'
  transcript: text("transcript"),
  grade: text("grade"), // 'pass' | 'almost' | 'fail'
  score: real("score"), // 0.0 - 1.0
  feedback: text("feedback"), // Tip/mnemonic from grader
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdCreatedAtIdx: index("attempt_user_id_created_at_idx").on(table.userId, table.createdAt),
}));

// Denormalized daily stats for fast aggregation
export const userDailyStats = pgTable("user_daily_stats", {
  userId: text("user_id").notNull().references(() => userProfile.userId),
  day: date("day").notNull(),
  attempts: integer("attempts").default(0),
  passes: integer("passes").default(0),
  fails: integer("fails").default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.day] }),
}));

// Type exports for use in application
export type UserProfile = typeof userProfile.$inferSelect;
export type NewUserProfile = typeof userProfile.$inferInsert;

export type Word = typeof word.$inferSelect;
export type NewWord = typeof word.$inferInsert;

export type UserWord = typeof userWord.$inferSelect;
export type NewUserWord = typeof userWord.$inferInsert;

export type Attempt = typeof attempt.$inferSelect;
export type NewAttempt = typeof attempt.$inferInsert;

export type UserDailyStats = typeof userDailyStats.$inferSelect;
export type NewUserDailyStats = typeof userDailyStats.$inferInsert;

export type Definition = typeof definition.$inferSelect;
export type NewDefinition = typeof definition.$inferInsert;

// Relations
export const wordRelations = relations(word, ({ many }) => ({
  definitions: many(definition),
  userWords: many(userWord),
  attempts: many(attempt),
}));

export const definitionRelations = relations(definition, ({ one }) => ({
  word: one(word, {
    fields: [definition.wordId],
    references: [word.id],
  }),
}));
