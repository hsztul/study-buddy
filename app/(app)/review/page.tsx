"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FlashcardStack, FlashcardStackRef } from "@/components/review/flashcard-stack";
import { ProgressStrip } from "@/components/review/progress-strip";
import { LandscapeSidebar } from "@/components/layout/landscape-sidebar";
import { WordSearch } from "@/components/review/word-search";
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
  const searchParams = useSearchParams();
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const flashcardStackRef = useRef<FlashcardStackRef>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWords = async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      setIsLoadingMore(false);

      // Cancel any ongoing background loads
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Fetch first chunk of 50 words for immediate display
      const response = await fetch("/api/words?limit=50&cursor=0", {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch words");
      }

      const data = await response.json();
      const firstChunk = data.words;
      setWords(firstChunk);
      
      // Count words in test queue
      const inQueue = firstChunk.filter((w: Word) => w.inTestQueue).length;
      setQueueCount(inQueue);
      
      // Count mastered words (those with 'pass' result)
      const mastered = firstChunk.filter((w: Word) => w.lastResult === 'pass').length;
      setMasteredCount(mastered);
      
      setIsLoading(false);

      // Check if we need to jump to a specific word (from test mode)
      const wordIdParam = searchParams.get('wordId');
      if (wordIdParam && firstChunk.length > 0) {
        const targetWordId = parseInt(wordIdParam, 10);
        const wordIndex = firstChunk.findIndex((w: Word) => w.id === targetWordId);
        if (wordIndex !== -1) {
          // Set initial index to the target word
          setTimeout(() => {
            flashcardStackRef.current?.jumpToWord(targetWordId);
          }, 100);
        }
      }

      // Load remaining words in the background if there are more
      if (data.hasMore && data.nextCursor !== null) {
        loadRemainingWords(data.nextCursor);
      } else {
        isLoadingRef.current = false;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error fetching words:", err);
      setError("Failed to load words. Please try again.");
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const loadRemainingWords = async (cursor: number) => {
    try {
      setIsLoadingMore(true);
      const response = await fetch(`/api/words?limit=50&cursor=${cursor}`, {
        signal: abortControllerRef.current?.signal,
      });
      
      if (!response.ok) {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
        return; // Silently fail for background loading
      }

      const data = await response.json();
      const newWords = data.words;

      if (newWords.length > 0) {
        setWords((prev) => {
          // Deduplicate by word ID
          const existingIds = new Set(prev.map(w => w.id));
          const uniqueNewWords = newWords.filter((w: Word) => !existingIds.has(w.id));
          const combined = [...prev, ...uniqueNewWords];
          
          // Update counts with all words
          const inQueue = combined.filter((w: Word) => w.inTestQueue).length;
          setQueueCount(inQueue);
          
          const mastered = combined.filter((w: Word) => w.lastResult === 'pass').length;
          setMasteredCount(mastered);
          
          return combined;
        });

        // Continue loading next chunk if there are more
        if (data.hasMore && data.nextCursor !== null) {
          loadRemainingWords(data.nextCursor);
        } else {
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }
      } else {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error loading more words:", err);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    fetchWords();
    
    // Cleanup: abort any ongoing requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isLoadingRef.current = false;
    };
  }, []);

  const handleQueueUpdate = () => {
    // Refetch to update queue count
    fetchWords();
  };

  const handleWordSelect = (wordId: number) => {
    flashcardStackRef.current?.jumpToWord(wordId);
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
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header with Search */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="mt-2 text-muted-foreground">
                Flip cards to see definitions and add words to your test stack
              </p>
            </div>
            <WordSearch allWords={words} onWordSelect={handleWordSelect} />
          </div>

          {/* Progress Strip */}
          <div className="space-y-2">
            <ProgressStrip
              current={masteredCount}
              total={words.length}
              inQueue={queueCount}
            />
            {isLoadingMore && (
              <p className="text-xs text-muted-foreground text-center">
                Loading more words...
              </p>
            )}
          </div>

          {/* Flashcard Stack */}
          <FlashcardStack ref={flashcardStackRef} words={words} onQueueUpdate={handleQueueUpdate} />
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
