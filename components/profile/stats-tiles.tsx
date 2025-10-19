"use client";

import { Card } from "@/components/ui/card";
import { BookOpen, Target, TrendingUp, Calendar } from "lucide-react";

interface StatsTilesProps {
  totalWords: number;
  dueToday: number;
  accuracyLast7Days: number;
  averageInterval: number;
}

export function StatsTiles({
  totalWords,
  dueToday,
  accuracyLast7Days,
  averageInterval,
}: StatsTilesProps) {
  const stats = [
    {
      label: "Words Studied",
      value: totalWords,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Due Today",
      value: dueToday,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      label: "7-Day Accuracy",
      value: `${accuracyLast7Days}%`,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Avg Interval",
      value: `${averageInterval}d`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.bgColor} p-2`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
