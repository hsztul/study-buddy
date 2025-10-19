"use client";

import { useState, useRef, useEffect } from "react";
import { Flashcard } from "./flashcard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Word {
  id: number;
  term: string;
  partOfSpeech?: string | null;
  inTestQueue?: boolean | null;
}

interface FlashcardStackProps {
  words: Word[];
  onQueueUpdate?: () => void;
}

const STORAGE_KEY = "review-card-position";

export function FlashcardStack({ words, onQueueUpdate }: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Restore saved position on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedIndex = parseInt(saved, 10);
        // Ensure saved index is valid for current word list
        if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < words.length) {
          return savedIndex;
        }
      }
    }
    return 0;
  });
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousWordsLength = useRef(words.length);

  if (words.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
          <p className="text-lg font-medium">No words available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Import words to start reviewing
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < words.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      localStorage.setItem(STORAGE_KEY, newIndex.toString());
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      localStorage.setItem(STORAGE_KEY, newIndex.toString());
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX; // Initialize end position
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 75; // Increased threshold to distinguish from taps
    const diff = touchStartX.current - touchEndX.current;

    // Only trigger navigation if it's a clear swipe (not a tap)
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        handleNext();
      } else {
        // Swiped right - go to previous
        handlePrevious();
      }
    }
    
    // Reset touch positions
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Reset position if word list changes (e.g., different deck loaded)
  useEffect(() => {
    if (words.length !== previousWordsLength.current) {
      previousWordsLength.current = words.length;
      // If the saved index is out of bounds for new word list, reset to 0
      if (currentIndex >= words.length) {
        setCurrentIndex(0);
        localStorage.setItem(STORAGE_KEY, "0");
      }
    }
  }, [words.length, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, words.length]);

  return (
    <div className="space-y-6">
      {/* Flashcard with swipe support */}
      <div
        ref={containerRef}
        className="mx-auto max-w-2xl touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Flashcard
          word={currentWord.term}
          wordId={currentWord.id}
          partOfSpeech={currentWord.partOfSpeech}
          inTestQueue={currentWord.inTestQueue || false}
          onQueueUpdate={onQueueUpdate}
        />
      </div>

      {/* Controls - hidden in landscape mobile only */}
      <div className="flex items-center justify-center gap-2 landscape:hidden landscape:md:flex">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-[100px] text-center text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Landscape mobile: minimal progress indicator */}
      <div className="hidden landscape:flex landscape:md:hidden">
        <div className="text-center text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </div>
      </div>
    </div>
  );
}
