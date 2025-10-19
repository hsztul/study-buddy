import { db } from "@/lib/db";
import { attempt, userDailyStats } from "@/lib/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

/**
 * Aggregate daily stats for a user
 * Upserts to user_daily_stats table
 */
export async function aggregateDailyStats(userId: string, date: Date): Promise<void> {
  // Normalize date to start of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get attempts for the day
  const dayAttempts = await db
    .select({
      total: sql<number>`count(*)`,
      passes: sql<number>`sum(case when ${attempt.grade} = 'pass' then 1 else 0 end)`,
      fails: sql<number>`sum(case when ${attempt.grade} = 'fail' then 1 else 0 end)`,
    })
    .from(attempt)
    .where(
      and(
        eq(attempt.userId, userId),
        gte(attempt.createdAt, startOfDay),
        lte(attempt.createdAt, endOfDay)
      )
    );

  const stats = dayAttempts[0];
  const total = stats?.total || 0;
  const passes = stats?.passes || 0;
  const fails = stats?.fails || 0;

  if (total === 0) {
    // No attempts for this day, skip
    return;
  }

  // Upsert to user_daily_stats
  await db
    .insert(userDailyStats)
    .values({
      userId,
      day: startOfDay,
      attempts: total,
      passes,
      fails,
    })
    .onConflictDoUpdate({
      target: [userDailyStats.userId, userDailyStats.day],
      set: {
        attempts: total,
        passes,
        fails,
      },
    });
}

/**
 * Recompute all due dates for a user
 * Useful for backfills or data corrections
 */
export async function recomputeDueDates(userId: string): Promise<void> {
  // This would be implemented if needed for admin operations
  // For now, SR algorithm handles due dates automatically
  console.log(`Recompute due dates for user ${userId} - not implemented yet`);
}
