"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddToTestCheckbox } from "./add-to-test-checkbox";
import { SpeechButton } from "@/components/ui/speech-button";

interface Definition {
  definition: string;
  example?: string;
  partOfSpeech?: string;
}

interface FlashcardProps {
  word: string;
  wordId: number;
  partOfSpeech?: string | null;
  inTestQueue?: boolean;
  onQueueUpdate?: () => void;
  onFlip?: () => void;
}

export interface FlashcardRef {
  flip: () => void;
}

export const Flashcard = forwardRef<FlashcardRef, FlashcardProps>(({ word, wordId, partOfSpeech, inTestQueue = false, onQueueUpdate, onFlip }, ref) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when wordId changes (new card)
  useEffect(() => {
    setIsFlipped(false);
    setDefinition(null);
    setIsLoading(false);
    setError(null);
  }, [wordId]);

  // Expose flip function to parent via ref
  useImperativeHandle(ref, () => ({
    flip: handleFlip,
  }));

  const handleFlip = async () => {
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);
    onFlip?.();

    // Mark as reviewed when flipping to back for the first time
    if (newFlipState && !isFlipped) {
      try {
        await fetch("/api/review/mark", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wordId }),
        });
      } catch (error) {
        console.error("Error marking card as reviewed:", error);
        // Don't show error to user, just log it
      }
    }

    // Fetch definition when flipping to back (if not already loaded)
    if (newFlipState && !definition && !isLoading) {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/words/${wordId}/definition`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch definition");
        }

        const data = await response.json();
        
        if (data.definitions && data.definitions.length > 0) {
          setDefinition(data.definitions[0]);
        } else {
          setError("Definition not found");
        }
      } catch (err) {
        console.error("Error fetching definition:", err);
        setError("Failed to load definition");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="perspective-1000 w-full">
      <Card
        className={cn(
          "relative h-[400px] cursor-pointer transition-transform duration-500 transform-style-3d",
          isFlipped && "rotate-y-180"
        )}
        onClick={handleFlip}
      >
        {/* Add to Test Stack Checkbox - Top Right */}
        <div 
          className={cn(
            "absolute top-4 right-4 z-10 transition-transform duration-500",
            isFlipped && "rotate-y-180"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <AddToTestCheckbox
            wordId={wordId}
            initialChecked={inTestQueue}
            onToggle={onQueueUpdate}
          />
        </div>
        {/* Front Side - Word */}
        <CardContent
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden",
            isFlipped && "invisible"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-bold text-center sm:text-5xl">{word}</h2>
              <SpeechButton 
                text={word} 
                voice="alloy"
                size="sm"
              />
            </div>
            {partOfSpeech && (
              <p className="text-sm text-muted-foreground italic">
                {partOfSpeech}
              </p>
            )}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Tap to see definition
          </p>
        </CardContent>

        {/* Back Side - Definition */}
        <CardContent
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180",
            !isFlipped && "invisible"
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading definition...</p>
            </div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">
                The dictionary API may be temporarily unavailable.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  setDefinition(null);
                  handleFlip();
                }}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : definition ? (
            <div className="space-y-4 text-center">
              {definition.partOfSpeech && (
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                  {definition.partOfSpeech}
                </p>
              )}
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg leading-relaxed">{definition.definition}</p>
                <SpeechButton
                  text={`${definition.definition}${definition.example ? `. Example: ${definition.example}` : ''}`}
                  voice="alloy"
                  size="sm"
                  title="Hear definition and example"
                />
              </div>
              {definition.example && (
                <div className="mt-4 border-l-4 border-muted pl-4">
                  <p className="text-sm italic text-muted-foreground">
                    "{definition.example}"
                  </p>
                </div>
              )}
              <p className="mt-6 text-sm text-muted-foreground">
                Tap to flip back
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No definition available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

Flashcard.displayName = "Flashcard";
