"use client";

import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type Grade = "pass" | "almost" | "fail";

interface ResultPanelProps {
  grade: Grade;
  transcript: string;
  feedback?: string;
  score?: number;
  onNext: () => void;
  onRetry: () => void;
}

export function ResultPanel({
  grade,
  transcript,
  feedback,
  score,
  onNext,
  onRetry,
}: ResultPanelProps) {
  const getGradeConfig = () => {
    switch (grade) {
      case "pass":
        return {
          icon: CheckCircle2,
          iconColor: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "Excellent!",
          message: "You nailed the essence of the definition.",
        };
      case "almost":
        return {
          icon: AlertCircle,
          iconColor: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          title: "Almost There!",
          message: "You're on the right track, but missing a key element.",
        };
      case "fail":
        return {
          icon: XCircle,
          iconColor: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          title: "Not Quite",
          message: "Let's review the definition together.",
        };
    }
  };

  const config = getGradeConfig();
  const Icon = config.icon;

  return (
    <Card className={`p-6 ${config.bgColor} border-2 ${config.borderColor}`}>
      <div className="space-y-4">
        {/* Grade indicator */}
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${config.iconColor}`} />
          <div>
            <h3 className="text-xl font-bold">{config.title}</h3>
            {score !== undefined && (
              <p className="text-sm text-muted-foreground">
                Score: {Math.round(score * 100)}%
              </p>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm">{config.message}</p>

        {/* Transcript */}
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">You said:</p>
          <p className="text-sm italic">&ldquo;{transcript}&rdquo;</p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Tip:</p>
            <p className="text-sm">{feedback}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {grade === "pass" ? (
            <Button onClick={onNext} className="flex-1" size="lg">
              Next Word
            </Button>
          ) : (
            <>
              <Button onClick={onRetry} variant="outline" className="flex-1" size="lg">
                Try Again
              </Button>
              <Button onClick={onNext} className="flex-1" size="lg">
                Next Word
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
