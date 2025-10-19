"use client";

import { Card } from "@/components/ui/card";

interface DailyAccuracy {
  date: string;
  accuracy: number;
  attempts: number;
}

interface AccuracyChartProps {
  dailyAccuracy: DailyAccuracy[];
}

export function AccuracyChart({ dailyAccuracy }: AccuracyChartProps) {
  if (dailyAccuracy.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No activity in the last 7 days. Start testing to see your progress!
        </p>
      </Card>
    );
  }

  const maxAccuracy = Math.max(...dailyAccuracy.map((d) => d.accuracy), 0.5);

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">7-Day Accuracy Trend</h3>
      <div className="space-y-3">
        {dailyAccuracy.map((day) => {
          const percentage = Math.round(day.accuracy * 100);
          const barWidth = (day.accuracy / maxAccuracy) * 100;
          
          return (
            <div key={day.date} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-medium">
                  {percentage}% <span className="text-xs text-muted-foreground">({day.attempts})</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
