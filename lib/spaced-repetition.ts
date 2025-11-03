import { db } from "@/lib/db";
import { userCard } from "@/lib/db/schema";
import { eq, and, sql, lte } from "drizzle-orm";

/**
 * Spaced Repetition Algorithm (Simple SR for Phase 1)
 * 
 * Rules:
 * - PASS: streak += 1, double interval (cap at 21 days)
 * - ALMOST: halve interval
 * - FAIL: reset to 1 day, streak = 0
 */

export type Grade = "pass" | "almost" | "fail";

interface UpdateResult {
  newInterval: number;
  newStreak: number;
  dueOn: Date;
}

/**
 * Update user_card record based on test result
 * Implements simple spaced repetition algorithm
 */
export async function updateUserCard(
  userId: string,
  cardId: number,
  stackId: number,
  grade: Grade
): Promise<UpdateResult> {
  // Get existing user_card record
  const existing = await db
    .select()
    .from(userCard)
    .where(and(eq(userCard.userId, userId), eq(userCard.cardId, cardId)))
    .limit(1);

  const now = new Date();
  let newInterval: number;
  let newStreak: number;
  let dueOn: Date;

  if (existing.length === 0) {
    // First attempt - create new record
    if (grade === "pass") {
      newInterval = 1;
      newStreak = 1;
    } else {
      newInterval = 1;
      newStreak = 0;
    }
    dueOn = addDays(now, newInterval);

    await db.insert(userCard).values({
      userId,
      cardId,
      stackId,
      lastResult: grade,
      streak: newStreak,
      intervalDays: newInterval,
      dueOn: dueOn.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
    });
  } else {
    // Update existing record
    const current = existing[0];
    const currentInterval = current.intervalDays || 0;
    const currentStreak = current.streak || 0;

    // Calculate new values based on grade
    if (grade === "pass") {
      newStreak = currentStreak + 1;
      if (currentInterval === 0) {
        newInterval = 1;
      } else {
        newInterval = Math.min(currentInterval * 2, 21); // Cap at 21 days
      }
    } else if (grade === "almost") {
      newStreak = currentStreak; // Keep streak
      newInterval = Math.max(1, Math.floor(currentInterval * 0.5));
    } else {
      // fail
      newStreak = 0;
      newInterval = 1;
    }

    dueOn = addDays(now, newInterval);

    await db
      .update(userCard)
      .set({
        lastResult: grade,
        streak: newStreak,
        intervalDays: newInterval,
        dueOn: dueOn.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      })
      .where(and(eq(userCard.userId, userId), eq(userCard.cardId, cardId)));
  }

  return {
    newInterval,
    newStreak,
    dueOn,
  };
}

/**
 * Get words due for review for a specific stack
 */
export async function getDueWordsForStack(userId: string, stackId: number, limit: number = 20): Promise<number[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueWords = await db
    .select({ cardId: userCard.cardId })
    .from(userCard)
    .where(
      and(
        eq(userCard.userId, userId),
        eq(userCard.stackId, stackId),
        // Due on or before today
        sql`${userCard.dueOn} <= ${today}`
      )
    )
    .orderBy(userCard.dueOn) // Oldest due first
    .limit(limit);

  return dueWords.map((w) => w.cardId);
}

/**
 * Get words due for review (all stacks)
 */
export async function getDueWords(userId: string, limit: number = 20): Promise<number[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueWords = await db
    .select({ cardId: userCard.cardId })
    .from(userCard)
    .where(
      and(
        eq(userCard.userId, userId),
        // Due on or before today
        sql`${userCard.dueOn} <= ${today}`
      )
    )
    .orderBy(userCard.dueOn) // Oldest due first
    .limit(limit);

  return dueWords.map((w) => w.cardId);
}

/**
 * Helper: Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get SR stats for a user
 */
export async function getSRStats(userId: string): Promise<{
  totalWords: number;
  dueToday: number;
  averageInterval: number;
}> {
  const allWords = await db
    .select()
    .from(userCard)
    .where(eq(userCard.userId, userId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueToday = allWords.filter((w) => {
    if (!w.dueOn) return false;
    const due = new Date(w.dueOn);
    due.setHours(0, 0, 0, 0);
    return due <= today;
  }).length;

  const totalInterval = allWords.reduce((sum, w) => sum + (w.intervalDays || 0), 0);
  const averageInterval = allWords.length > 0 ? totalInterval / allWords.length : 0;

  return {
    totalWords: allWords.length,
    dueToday,
    averageInterval: Math.round(averageInterval * 10) / 10,
  };
}
