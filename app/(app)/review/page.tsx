"use client";

import { useEffect, useState } from "react";
import { FlashcardStack } from "@/components/review/flashcard-stack";
import { ProgressStrip } from "@/components/review/progress-strip";
import { LandscapeSidebar } from "@/components/layout/landscape-sidebar";
import { Loader2 } from "lucide-react";

interface Word {
  id: number;
  term: string;
  partOfSpeech?: string | null;
  inTestQueue?: boolean | null;
  streak?: number | null;
  lastResult?: string | null;
}

export default function ReviewPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);

  const fetchWords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/words?limit=50");
      
      if (!response.ok) {
        throw new Error("Failed to fetch words");
      }

      const data = await response.json();
      setWords(data.words);
      
      // Count words in test queue
      const inQueue = data.words.filter((w: Word) => w.inTestQueue).length;
      setQueueCount(inQueue);
      
      // Count mastered words (those with 'pass' result)
      const mastered = data.words.filter((w: Word) => w.lastResult === 'pass').length;
      setMasteredCount(mastered);
    } catch (err) {
      console.error("Error fetching words:", err);
      setError("Failed to load words. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const handleQueueUpdate = () => {
    // Refetch to update queue count
    fetchWords();
  };

  if (isLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading words...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop and Portrait Mobile Layout */}
      <div className="container block px-4 py-8 sm:px-6 landscape:hidden landscape:md:block">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Review Mode</h1>
            <p className="mt-2 text-muted-foreground">
              Flip cards to see definitions and add words to your test queue
            </p>
          </div>

          {/* Progress Strip */}
          <ProgressStrip
            current={masteredCount}
            total={words.length}
            inQueue={queueCount}
          />

          {/* Flashcard Stack */}
          <FlashcardStack words={words} onQueueUpdate={handleQueueUpdate} />
        </div>
      </div>

      {/* Landscape Mobile ONLY Layout - Fullscreen with minimal UI */}
      <div className="fixed inset-0 hidden landscape:flex landscape:md:hidden">
        <LandscapeSidebar />
        {/* Flashcard takes full screen with sidebar offset */}
        <div className="ml-16 flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <FlashcardStack words={words} onQueueUpdate={handleQueueUpdate} />
          </div>
        </div>
      </div>
    </>
  );
}
