"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { FlashcardStack, FlashcardStackRef } from "@/components/review/flashcard-stack";
import { Loader2 } from "lucide-react";

interface Card {
  id: number;
  term: string;
  definition: string;
  partOfSpeech?: string | null;
  source: string;
  inTestQueue?: boolean | null;
  streak?: number | null;
  lastResult?: string | null;
  hasReviewed?: boolean | null;
}

export default function StackReviewPage() {
  const params = useParams();
  const stackId = params.id as string;
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const flashcardStackRef = useRef<FlashcardStackRef>(null);
  const isLoadingRef = useRef(false);

  const fetchCards = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple fetches
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/stacks/${stackId}/cards?limit=500`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }

      const data = await response.json();
      setCards(data.cards);
      
      // Count cards in test queue
      const inQueue = data.cards.filter((c: Card) => c.inTestQueue).length;
      setQueueCount(inQueue);
      
      // Count reviewed cards
      const reviewed = data.cards.filter((c: Card) => c.hasReviewed).length;
      setReviewedCount(reviewed);
      
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error fetching cards:", err);
      setError("Failed to load cards. Please try again.");
      setIsLoading(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [stackId]);

  useEffect(() => {
    fetchCards();
  }, [stackId, fetchCards]);

  const handleQueueUpdate = (cardId: number, inQueue: boolean) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, inTestQueue: inQueue } : card
      )
    );
    setQueueCount((prev) => (inQueue ? prev + 1 : prev - 1));
  };

  const handleReviewUpdate = (cardId: number) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, hasReviewed: true } : card
      )
    );
    setReviewedCount((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={fetchCards}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-muted-foreground mb-4">No cards in this stack yet.</p>
        <p className="text-sm text-muted-foreground">
          Add cards to start reviewing!
        </p>
      </div>
    );
  }

  // Convert cards to the format expected by FlashcardStack (word-like interface)
  const wordsForFlashcards = cards.map((card) => ({
    id: card.id,
    term: card.term,
    partOfSpeech: card.partOfSpeech,
    inTestQueue: card.inTestQueue,
    streak: card.streak,
    lastResult: card.lastResult,
    definition: card.definition,
  }));

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* Flashcard Stack */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <FlashcardStack
            ref={flashcardStackRef}
            words={wordsForFlashcards}
            stackId={parseInt(stackId)}
            queueCount={queueCount}
            onQueueUpdate={handleQueueUpdate}
            onReviewUpdate={handleReviewUpdate}
          />
        </div>
      </div>
    </div>
  );
}
