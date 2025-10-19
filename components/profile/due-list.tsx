"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

interface DueWord {
  wordId: number;
  term: string;
  dueOn: Date | null;
}

interface DueListProps {
  dueWords: DueWord[];
}

export function DueList({ dueWords }: DueListProps) {
  const router = useRouter();

  if (dueWords.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold">All Caught Up!</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          No words due for review today. Great job!
        </p>
        <Button onClick={() => router.push("/review")} variant="outline">
          Review More Words
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Due for Review</h3>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {dueWords.length} word{dueWords.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mb-4 space-y-2">
        {dueWords.slice(0, 10).map((word) => (
          <div
            key={word.wordId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <span className="font-medium">{word.term}</span>
            <span className="text-xs text-muted-foreground">Due today</span>
          </div>
        ))}
      </div>
      {dueWords.length > 10 && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          +{dueWords.length - 10} more
        </p>
      )}
      <Button onClick={() => router.push("/test")} className="w-full">
        Start Testing
      </Button>
    </Card>
  );
}
