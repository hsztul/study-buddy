import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
  userWord, 
  word, 
  attempt
} from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";
    const sort = searchParams.get("sort") || "recently-reviewed";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Start with a simpler base query - only show reviewed or tested cards
    let baseQuery = db
      .select({
        id: word.id,
        term: word.term,
        partOfSpeech: word.partOfSpeech,
        hasReviewed: userWord.hasReviewed,
        firstReviewedAt: userWord.firstReviewedAt,
        lastReviewedAt: userWord.lastReviewedAt,
        lastResult: userWord.lastResult,
        streak: userWord.streak,
        inTestQueue: userWord.inTestQueue,
      })
      .from(userWord)
      .leftJoin(word, eq(userWord.wordId, word.id))
      .where(and(
        eq(userWord.userId, userId),
        // Only show cards that have been reviewed OR have attempts
        sql`(${userWord.hasReviewed} = true OR EXISTS (
          SELECT 1 FROM ${attempt} 
          WHERE ${attempt.userId} = ${userId} 
          AND ${attempt.wordId} = ${userWord.wordId}
        ))`
      ));

    // Apply search filter
    if (search) {
      baseQuery = baseQuery.where(ilike(word.term, `%${search}%`));
    }

    // Apply status filter
    switch (filter) {
      case "reviewed":
        baseQuery = baseQuery.where(eq(userWord.hasReviewed, true));
        break;
      case "tested":
        // Only show cards that have attempts (regardless of reviewed status)
        baseQuery = baseQuery.where(sql`EXISTS (
          SELECT 1 FROM ${attempt} 
          WHERE ${attempt.userId} = ${userId} 
          AND ${attempt.wordId} = ${userWord.wordId}
        )`);
        break;
      case "correct":
        baseQuery = baseQuery.where(eq(userWord.lastResult, "pass"));
        break;
      case "incorrect":
        baseQuery = baseQuery.where(sql`${userWord.lastResult} IN ('fail', 'almost')`);
        break;
      // "all" now means reviewed OR tested (due to base query filter)
    }

    // Apply sorting
    switch (sort) {
      case "recently-reviewed":
        baseQuery = baseQuery.orderBy(desc(userWord.lastReviewedAt));
        break;
      case "alphabetical":
        baseQuery = baseQuery.orderBy(asc(word.term));
        break;
      default:
        baseQuery = baseQuery.orderBy(desc(userWord.lastReviewedAt));
        break;
    }

    // Get the base cards
    const cards = await baseQuery.limit(limit).offset(offset);

    // Get attempt counts for each card
    const cardsWithStats = await Promise.all(
      cards.map(async (card) => {
        const attemptStats = await db
          .select({
            attemptCount: count(attempt.id),
            correctAttempts: sql<number>`
              SUM(CASE WHEN ${attempt.grade} = 'pass' THEN 1 ELSE 0 END)
            `.as("correct_attempts"),
            lastAttemptAt: sql<Date>`MAX(${attempt.createdAt})`.as("last_attempt_at"),
          })
          .from(attempt)
          .where(and(eq(attempt.userId, userId), eq(attempt.wordId, card.id)))
          .groupBy(attempt.wordId);

        const stats = attemptStats[0] || {
          attemptCount: 0,
          correctAttempts: 0,
          lastAttemptAt: null,
        };

        return {
          ...card,
          attemptCount: Number(stats.attemptCount),
          correctAttempts: Number(stats.correctAttempts),
          lastAttemptAt: stats.lastAttemptAt,
        };
      })
    );

    // Apply additional sorting that requires attempt data
    if (sort === "recently-tested") {
      cardsWithStats.sort((a, b) => {
        const aTime = a.lastAttemptAt ? new Date(a.lastAttemptAt).getTime() : 0;
        const bTime = b.lastAttemptAt ? new Date(b.lastAttemptAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (sort === "accuracy") {
      cardsWithStats.sort((a, b) => {
        const aAccuracy = a.attemptCount > 0 ? a.correctAttempts / a.attemptCount : 0;
        const bAccuracy = b.attemptCount > 0 ? b.correctAttempts / b.attemptCount : 0;
        return bAccuracy - aAccuracy;
      });
    }

    // Get total count with same filter as base query
    const totalCount = await db
      .select({ count: count() })
      .from(userWord)
      .leftJoin(word, eq(userWord.wordId, word.id))
      .where(and(
        eq(userWord.userId, userId),
        // Only count cards that have been reviewed OR have attempts
        sql`(${userWord.hasReviewed} = true OR EXISTS (
          SELECT 1 FROM ${attempt} 
          WHERE ${attempt.userId} = ${userId} 
          AND ${attempt.wordId} = ${userWord.wordId}
        ))`
      ));

    return NextResponse.json({
      cards: cardsWithStats,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching my cards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
