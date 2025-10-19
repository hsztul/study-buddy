"use client";

import { Button } from "@/components/ui/button";

interface SessionFooterProps {
  currentIndex: number;
  totalWords: number;
  accuracy?: number;
  onEndSession: () => void;
}

export function SessionFooter({
  currentIndex,
  totalWords,
  accuracy,
  onEndSession,
}: SessionFooterProps) {
  return (
    <div className="border-t bg-white py-4">
      <div className="container mx-auto flex items-center justify-between px-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Progress: </span>
            <span className="font-semibold">
              {currentIndex + 1} / {totalWords}
            </span>
          </div>
          {accuracy !== undefined && (
            <div>
              <span className="text-muted-foreground">Accuracy: </span>
              <span className="font-semibold">{Math.round(accuracy * 100)}%</span>
            </div>
          )}
        </div>
        <Button onClick={onEndSession} variant="outline" size="sm">
          End Session
        </Button>
      </div>
    </div>
  );
}
