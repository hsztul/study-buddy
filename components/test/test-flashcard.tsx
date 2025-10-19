"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Recorder } from "./recorder";
import { cn } from "@/lib/utils";

export type Grade = "pass" | "almost" | "fail";

interface TestFlashcardProps {
  word: string;
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  result?: {
    grade: Grade;
    transcript: string;
    feedback?: string;
    score?: number;
  } | null;
  onNext: () => void;
  onRetry: () => void;
}

export function TestFlashcard({
  word,
  onRecordingComplete,
  disabled,
  isProcessing,
  result,
  onNext,
  onRetry,
}: TestFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Flip to back when result is available
  useEffect(() => {
    if (result) {
      // Small delay for better UX
      setTimeout(() => setIsFlipped(true), 300);
    } else {
      setIsFlipped(false);
    }
  }, [result]);

  const getGradeConfig = (grade: Grade) => {
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

  return (
    <div className="perspective-1000 w-full">
      <Card
        className={cn(
          "relative h-[400px] transition-transform duration-500 transform-style-3d",
          isFlipped && "rotate-y-180"
        )}
      >
        {/* Front Side - Word & Recorder */}
        <CardContent
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden",
            isFlipped && "invisible"
          )}
        >
          {isProcessing ? (
            // Loading state
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Transcribing and grading your response...
              </p>
            </div>
          ) : (
            // Normal test state
            <div className="w-full space-y-8">
              {/* Word display */}
              <div className="text-center">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Define this word:
                </p>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {word}
                </h2>
              </div>

              {/* Recorder */}
              <div className="flex justify-center">
                <Recorder
                  onRecordingComplete={onRecordingComplete}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </CardContent>

        {/* Back Side - Result */}
        <CardContent
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden rotate-y-180",
            !isFlipped && "invisible"
          )}
        >
          {result && (
            <div className="w-full h-full flex flex-col">
              {(() => {
                const config = getGradeConfig(result.grade);
                const Icon = config.icon;

                return (
                  <div
                    className={`flex-1 rounded-lg p-6 ${config.bgColor} border-2 ${config.borderColor} flex flex-col`}
                  >
                    <div className="space-y-4 flex-1">
                      {/* Grade indicator */}
                      <div className="flex items-center gap-3">
                        <Icon className={`h-8 w-8 ${config.iconColor}`} />
                        <div>
                          <h3 className="text-xl font-bold">{config.title}</h3>
                          {result.score !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              Score: {Math.round(result.score * 100)}%
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-sm">{config.message}</p>

                      {/* Transcript */}
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          You said:
                        </p>
                        <p className="text-sm italic">
                          &ldquo;{result.transcript}&rdquo;
                        </p>
                      </div>

                      {/* Feedback */}
                      {result.feedback && (
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Tip:
                          </p>
                          <p className="text-sm">{result.feedback}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      {result.grade === "pass" ? (
                        <Button onClick={onNext} className="flex-1" size="lg">
                          Next Word
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={onRetry}
                            variant="outline"
                            className="flex-1"
                            size="lg"
                          >
                            Try Again
                          </Button>
                          <Button onClick={onNext} className="flex-1" size="lg">
                            Next Word
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
