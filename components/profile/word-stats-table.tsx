"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface WordStat {
  wordId: number;
  term: string;
  streak: number;
  lastResult: string | null;
  intervalDays: number;
  dueOn: Date | null;
  totalAttempts: number;
  passes: number;
  accuracy: number;
}

interface WordStatsTableProps {
  wordStats: WordStat[];
}

export function WordStatsTable({ wordStats }: WordStatsTableProps) {
  const getResultIcon = (result: string | null) => {
    switch (result) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "almost":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Overdue";
    return `${diffDays}d`;
  };

  if (wordStats.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No words studied yet. Start reviewing to see your progress!
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Word</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Streak</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Last</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Accuracy</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {wordStats.slice(0, 20).map((stat) => (
              <tr key={stat.wordId} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{stat.term}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    {stat.streak} 🔥
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {getResultIcon(stat.lastResult)}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {stat.totalAttempts > 0
                    ? `${Math.round(stat.accuracy * 100)}%`
                    : "—"}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({stat.totalAttempts})
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {formatDate(stat.dueOn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {wordStats.length > 20 && (
        <div className="border-t bg-muted/30 px-4 py-2 text-center text-sm text-muted-foreground">
          Showing top 20 words by streak
        </div>
      )}
    </Card>
  );
}
