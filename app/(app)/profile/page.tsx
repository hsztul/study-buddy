import { auth, currentUser } from "@clerk/nextjs/server";
import { StatsTiles } from "@/components/profile/stats-tiles";
import { AccuracyChart } from "@/components/profile/accuracy-chart";
import { DueList } from "@/components/profile/due-list";
import { WordStatsTable } from "@/components/profile/word-stats-table";
import { Card } from "@/components/ui/card";

async function getStats(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/stats/overview`,
      {
        headers: {
          Cookie: `__session=${userId}`, // Pass auth context
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
  }

  const stats = await getStats(userId);

  return (
    <div className="container px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Track your progress and review your stats
          </p>
        </div>

        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        {stats && (
          <>
            <StatsTiles
              totalWords={stats.overview.totalWords}
              dueToday={stats.overview.dueToday}
              accuracyLast7Days={stats.overview.accuracyLast7Days}
              averageInterval={stats.overview.averageInterval}
            />

            {/* Charts and Due List */}
            <div className="grid gap-8 lg:grid-cols-2">
              <AccuracyChart dailyAccuracy={stats.dailyAccuracy} />
              <DueList
                dueWords={stats.wordStats
                  .filter((w: any) => {
                    if (!w.dueOn) return false;
                    const due = new Date(w.dueOn);
                    const today = new Date();
                    due.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    return due <= today;
                  })
                  .slice(0, 20)}
              />
            </div>

            {/* Word Stats Table */}
            <div>
              <h2 className="mb-4 text-2xl font-bold">Word Progress</h2>
              <WordStatsTable wordStats={stats.wordStats} />
            </div>
          </>
        )}

        {!stats && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Failed to load stats. Please try again later.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
