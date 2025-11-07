import { pgTable, text, serial, integer, real, boolean, timestamp, date, bigserial, smallint, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users are managed by Clerk; we store profile + denormalized stats
export const userProfile = pgTable("user_profile", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Card stacks (collections of cards)
export const cardStack = pgTable("card_stack", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfile.userId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isProtected: boolean("is_protected").default(false).notNull(), // true for SAT Vocab (can't edit/delete)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("card_stack_user_id_idx").on(table.userId),
}));

// Cards (terms + definitions) - belongs to a stack
export const card = pgTable("card", {
  id: serial("id").primaryKey(),
  stackId: integer("stack_id").notNull().references(() => cardStack.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  definition: text("definition").notNull(), // user-provided or primary definition
  partOfSpeech: text("part_of_speech"), // only for SAT vocab
  source: text("source").default("user").notNull(), // 'user' | 'sat_base'
  position: integer("position").notNull().default(0), // Card order within stack for drag-and-drop
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  stackIdIdx: index("card_stack_id_idx").on(table.stackId),
  termIdx: index("card_term_idx").on(table.term),
  stackIdPositionIdx: index("card_stack_id_position_idx").on(table.stackId, table.position),
}));

// Cached definitions for SAT vocab cards (from dictionary API)
export const definition = pgTable("definition", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().references(() => card.id, { onDelete: "cascade" }),
  definition: text("definition").notNull(),
  example: text("example"),
  partOfSpeech: text("part_of_speech").notNull(),
  phonetic: text("phonetic"),
  synonyms: text("synonyms"), // JSON array stored as text
  antonyms: text("antonyms"), // JSON array stored as text
  rank: smallint("rank").notNull().default(1), // 1 = primary, 2+ = alternates
  source: text("source").notNull().default("llm-gpt-5-nano"), // 'llm-gpt-5-nano' | 'free-dictionary-api' | 'exa' | etc
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
}, (table) => ({
  cardIdRankIdx: index("definition_card_id_rank_idx").on(table.cardId, table.rank),
}));

// User-specific card mastery tracking (spaced repetition + accuracy) - per stack
export const userCard = pgTable("user_card", {
  userId: text("user_id").notNull().references(() => userProfile.userId, { onDelete: "cascade" }),
  cardId: integer("card_id").notNull().references(() => card.id, { onDelete: "cascade" }),
  stackId: integer("stack_id").notNull().references(() => cardStack.id, { onDelete: "cascade" }),
  inTestQueue: boolean("in_test_queue").default(false),
  ease: real("ease").default(2.5), // For future SR algorithms
  intervalDays: integer("interval_days").default(0),
  dueOn: date("due_on"),
  stability: real("stability"), // Reserved for FSRS
  lastResult: text("last_result"), // 'pass' | 'fail' | 'almost'
  streak: integer("streak").default(0),
  hasReviewed: boolean("has_reviewed").default(false), // user has flipped the card
  firstReviewedAt: timestamp("first_reviewed_at"), // when card was first flipped
  lastReviewedAt: timestamp("last_reviewed_at"), // when card was last flipped
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.cardId] }),
  userIdStackIdDueOnIdx: index("user_card_user_id_stack_id_due_on_idx").on(table.userId, table.stackId, table.dueOn),
  userIdHasReviewedIdx: index("user_card_user_id_has_reviewed_idx").on(table.userId, table.hasReviewed),
}));

// Individual test attempts
export const attempt = pgTable("attempt", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull().references(() => userProfile.userId),
  cardId: integer("card_id").notNull().references(() => card.id),
  stackId: integer("stack_id").notNull().references(() => cardStack.id),
  mode: text("mode").notNull(), // 'test' | 'review'
  transcript: text("transcript"),
  grade: text("grade"), // 'pass' | 'almost' | 'fail'
  score: real("score"), // 0.0 - 1.0
  feedback: text("feedback"), // Tip/mnemonic from grader
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdStackIdCreatedAtIdx: index("attempt_user_id_stack_id_created_at_idx").on(table.userId, table.stackId, table.createdAt),
}));

// Denormalized daily stats for fast aggregation - per stack
export const userDailyStats = pgTable("user_daily_stats", {
  userId: text("user_id").notNull().references(() => userProfile.userId),
  stackId: integer("stack_id").notNull().references(() => cardStack.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  attempts: integer("attempts").default(0),
  passes: integer("passes").default(0),
  fails: integer("fails").default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.stackId, table.day] }),
}));

// Type exports for use in application
export type UserProfile = typeof userProfile.$inferSelect;
export type NewUserProfile = typeof userProfile.$inferInsert;

export type CardStack = typeof cardStack.$inferSelect;
export type NewCardStack = typeof cardStack.$inferInsert;

export type Card = typeof card.$inferSelect;
export type NewCard = typeof card.$inferInsert;

export type UserCard = typeof userCard.$inferSelect;
export type NewUserCard = typeof userCard.$inferInsert;

export type Attempt = typeof attempt.$inferSelect;
export type NewAttempt = typeof attempt.$inferInsert;

export type UserDailyStats = typeof userDailyStats.$inferSelect;
export type NewUserDailyStats = typeof userDailyStats.$inferInsert;

export type Definition = typeof definition.$inferSelect;
export type NewDefinition = typeof definition.$inferInsert;

// Relations
export const cardStackRelations = relations(cardStack, ({ one, many }) => ({
  user: one(userProfile, {
    fields: [cardStack.userId],
    references: [userProfile.userId],
  }),
  cards: many(card),
  userCards: many(userCard),
  attempts: many(attempt),
  dailyStats: many(userDailyStats),
}));

export const cardRelations = relations(card, ({ one, many }) => ({
  stack: one(cardStack, {
    fields: [card.stackId],
    references: [cardStack.id],
  }),
  definitions: many(definition),
  userCards: many(userCard),
  attempts: many(attempt),
}));

export const definitionRelations = relations(definition, ({ one }) => ({
  card: one(card, {
    fields: [definition.cardId],
    references: [card.id],
  }),
}));

export const userCardRelations = relations(userCard, ({ one }) => ({
  user: one(userProfile, {
    fields: [userCard.userId],
    references: [userProfile.userId],
  }),
  card: one(card, {
    fields: [userCard.cardId],
    references: [card.id],
  }),
  stack: one(cardStack, {
    fields: [userCard.stackId],
    references: [cardStack.id],
  }),
}));

export const attemptRelations = relations(attempt, ({ one }) => ({
  user: one(userProfile, {
    fields: [attempt.userId],
    references: [userProfile.userId],
  }),
  card: one(card, {
    fields: [attempt.cardId],
    references: [card.id],
  }),
  stack: one(cardStack, {
    fields: [attempt.stackId],
    references: [cardStack.id],
  }),
}));
