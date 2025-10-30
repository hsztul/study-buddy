"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Recorder } from "./recorder";
import { SpeechButton } from "@/components/ui/speech-button";
import { cn } from "@/lib/utils";

export type Grade = "pass" | "almost" | "fail";

interface TestFlashcardProps {
  word: string;
  wordId: number; // Add wordId prop
  definition?: string; // Add definition prop
  example?: string; // Add example prop
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
  onBackToReview: (wordId: number) => void; // Add back to review callback
}

export function TestFlashcard({
  word,
  wordId,
  definition,
  example,
  onRecordingComplete,
  disabled,
  isProcessing,
  result,
  onNext,
  onRetry,
  onBackToReview,
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
          "relative transition-transform duration-500 transform-style-3d",
          isFlipped ? "min-h-[400px]" : "h-[400px]",
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
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {word}
                  </h2>
                  <SpeechButton 
                    text={word} 
                    voice="alloy"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Recorder */}
              <div className="flex justify-center">
                <Recorder
                  onRecordingComplete={onRecordingComplete}
                  disabled={disabled}
                />
              </div>

              {/* Bottom right button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => onBackToReview(wordId)}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1 h-7"
                  title="Go back to review this word"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Review
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Back Side - Result */}
        <CardContent
          className={cn(
            "flex flex-col items-center justify-center p-4 backface-hidden rotate-y-180",
            !isFlipped && "invisible",
            isFlipped ? "relative" : "absolute inset-0"
          )}
        >
          {result && (
            <div className="w-full flex flex-col">
              {(() => {
                const config = getGradeConfig(result.grade);
                const Icon = config.icon;

                return (
                  <div
                    className={`rounded-lg p-4 ${config.bgColor} border-2 ${config.borderColor} flex flex-col`}
                  >
                    <div className="flex flex-col">
                      {/* Grade indicator and actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-6 w-6 ${config.iconColor}`} />
                          <div>
                            <h3 className="text-lg font-semibold">{config.title}</h3>
                            {result.score !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Score: {Math.round(result.score * 100)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            onClick={() => onBackToReview(wordId)}
                            variant="outline"
                            size="sm"
                            title="Go back to review this word"
                          >
                            <BookOpen className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          {result.grade === "pass" ? (
                            <Button onClick={onNext} size="sm">
                              Next Word
                            </Button>
                          ) : (
                            <Button
                              onClick={onRetry}
                              variant="outline"
                              size="sm"
                            >
                              Try Again
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Scrollable body */}
                      <div className="mt-2 space-y-2 overflow-y-auto pr-1 max-h-[60vh]">

                      {/* Definition and example */}
                      {definition && (
                        <div className="rounded-lg bg-white p-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Definition:
                            </p>
                            <SpeechButton
                              text={`${definition}${example ? `. Example: ${example}` : ''}`}
                              voice="alloy"
                              size="sm"
                              title="Hear definition and example"
                            />
                          </div>
                          <p className="text-sm leading-relaxed">{definition}</p>
                          {example && (
                            <div className="mt-1 border-l-4 border-muted pl-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Example:
                              </p>
                              <p className="text-sm italic text-muted-foreground">
                                "{example}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message */}
                      <p className="text-xs">{config.message}</p>

                      {/* Transcript */}
                      <div className="rounded-lg bg-white p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          You said:
                        </p>
                        <p className="text-sm italic">
                          &ldquo;{result.transcript}&rdquo;
                        </p>
                      </div>

                      {/* Feedback */}
                      {result.feedback && (
                        <div className="rounded-lg bg-white p-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Tip:
                          </p>
                          <p className="text-sm">{result.feedback}</p>
                        </div>
                      )}
                      </div>
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
