import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attempt, userCard, card } from "@/lib/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { getSRStats } from "@/lib/spaced-repetition";

/**
 * GET /api/stats/overview
 * Returns user statistics for profile page
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get SR stats
    const srStats = await getSRStats(userId);

    // Get total attempts
    const totalAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(attempt)
      .where(eq(attempt.userId, userId));

    // Get accuracy last 7 days
    const recentAttempts = await db
      .select({
        grade: attempt.grade,
      })
      .from(attempt)
      .where(and(eq(attempt.userId, userId), gte(attempt.createdAt, sevenDaysAgo)));

    const passCount = recentAttempts.filter((a) => a.grade === "pass").length;
    const accuracyLast7Days =
      recentAttempts.length > 0 ? passCount / recentAttempts.length : 0;

    // Get per-card stats
    const perCardStats = await db
      .select({
        cardId: userCard.cardId,
        term: card.term,
        streak: userCard.streak,
        lastResult: userCard.lastResult,
        intervalDays: userCard.intervalDays,
        dueOn: userCard.dueOn,
      })
      .from(userCard)
      .innerJoin(card, eq(userCard.cardId, card.id))
      .where(eq(userCard.userId, userId))
      .orderBy(desc(userCard.streak));

    // Get attempt counts per card
    const attemptCounts = await db
      .select({
        cardId: attempt.cardId,
        totalAttempts: sql<number>`count(*)`,
        passes: sql<number>`sum(case when ${attempt.grade} = 'pass' then 1 else 0 end)`,
      })
      .from(attempt)
      .where(eq(attempt.userId, userId))
      .groupBy(attempt.cardId);

    // Combine per-card stats with attempt counts
    const cardStats = perCardStats.map((cs) => {
      const attemptData = attemptCounts.find((ac) => ac.cardId === cs.cardId);
      return {
        ...cs,
        totalAttempts: attemptData?.totalAttempts || 0,
        passes: attemptData?.passes || 0,
        accuracy:
          attemptData && attemptData.totalAttempts > 0
            ? attemptData.passes / attemptData.totalAttempts
            : 0,
      };
    });

    // Get daily accuracy for chart (last 7 days)
    const dailyStats = await db
      .select({
        day: sql<string>`DATE(${attempt.createdAt})`,
        total: sql<number>`count(*)`,
        passes: sql<number>`sum(case when ${attempt.grade} = 'pass' then 1 else 0 end)`,
      })
      .from(attempt)
      .where(and(eq(attempt.userId, userId), gte(attempt.createdAt, sevenDaysAgo)))
      .groupBy(sql`DATE(${attempt.createdAt})`)
      .orderBy(sql`DATE(${attempt.createdAt})`);

    const dailyAccuracy = dailyStats.map((ds) => ({
      date: ds.day,
      accuracy: ds.total > 0 ? ds.passes / ds.total : 0,
      attempts: ds.total,
    }));

    return NextResponse.json({
      overview: {
        totalWords: srStats.totalWords,
        dueToday: srStats.dueToday,
        totalAttempts: totalAttempts[0]?.count || 0,
        accuracyLast7Days: Math.round(accuracyLast7Days * 100),
        averageInterval: srStats.averageInterval,
      },
      cardStats,
      dailyAccuracy,
    });
  } catch (error) {
    console.error("Stats overview API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
