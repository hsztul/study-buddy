"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { MicPermissionExplainer } from "@/components/test/mic-permission-explainer";
import { MicPermissionDenied } from "@/components/test/mic-permission-denied";
import { TestFlashcard, Grade } from "@/components/test/test-flashcard";
import { SessionFooter } from "@/components/test/session-footer";
import { TestProgressStrip } from "@/components/test/test-progress-strip";
import { LandscapeSidebar } from "@/components/layout/landscape-sidebar";
import { Spinner } from "@/components/ui/spinner";
import { AudioRecorder } from "@/lib/audio-recorder";
import SignUpCTA from "@/components/auth/sign-up-cta";

type PermissionState = "unknown" | "prompt" | "granted" | "denied";
type TestState = "permission" | "loading" | "testing" | "complete";

interface Card {
  id: number;
  term: string;
  lastResult?: string | null;
}

interface AttemptResult {
  grade: Grade;
  transcript: string;
  feedback?: string;
  score?: number;
}

export default function StackTestPage() {
  const router = useRouter();
  const params = useParams();
  const { isSignedIn } = useAuth();
  const stackId = parseInt(params.id as string);
  const stackName = params.name as string;
  
  // Show sign-up CTA for non-authenticated users
  if (!isSignedIn) {
    return (
      <SignUpCTA 
        mode="test" 
        onBack={() => router.push(`/stacks/${stackId}/${params.name}/review`)}
      />
    );
  }
  
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [testState, setTestState] = useState<TestState>("permission");
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState<{ cardId: number; grade: Grade }[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [currentDefinition, setCurrentDefinition] = useState<string>("");
  const [currentExample, setCurrentExample] = useState<string>("");

  // Check mic permission on mount
  useEffect(() => {
    checkMicPermission();
  }, []);

  const fetchCardDefinition = async (cardId: number) => {
    try {
      const response = await fetch(`/api/words/${cardId}/definition`);
      if (response.ok) {
        const data = await response.json();
        if (data.definitions && data.definitions.length > 0) {
          const definition = data.definitions[0];
          setCurrentDefinition(definition.definition || "");
          setCurrentExample(definition.example || "");
        } else {
          setCurrentDefinition("");
          setCurrentExample("");
        }
      } else {
        setCurrentDefinition("");
        setCurrentExample("");
      }
    } catch (error) {
      console.error("Error fetching definition:", error);
      setCurrentDefinition("");
      setCurrentExample("");
    }
  };

  // Fetch definition and example when current card changes
  useEffect(() => {
    const currentCard = cards[currentIndex];
    if (currentCard?.id) {
      fetchCardDefinition(currentCard.id);
    } else {
      setCurrentDefinition("");
      setCurrentExample("");
    }
  }, [currentIndex, cards.length]);

  const checkMicPermission = async () => {
    const permission = await AudioRecorder.checkPermission();
    console.log("[Test] Initial permission check:", permission);
    setPermissionState(permission);

    if (permission === "granted") {
      loadCards();
    } else {
      // Show permission explainer for "prompt" or stay on denied screen
      setTestState("permission");
    }
  };

  const handleContinue = async () => {
    console.log("[Test] User clicked continue, requesting mic access...");
    
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[Test] getUserMedia not supported");
      alert("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Safari, or Firefox.");
      return;
    }
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Test] Microphone access granted!");
      
      // Clean up the stream immediately
      stream.getTracks().forEach((track) => track.stop());
      
      // Store permission state for future visits (iOS Safari fallback)
      AudioRecorder.storePermissionGranted();
      
      setPermissionState("granted");
      setTestState("loading");
      loadCards();
    } catch (error: any) {
      console.error("[Test] Microphone access denied:", error);
      console.error("[Test] Error name:", error.name);
      console.error("[Test] Error message:", error.message);
      setPermissionState("denied");
      setTestState("permission");
    }
  };

  const handleRetry = () => {
    checkMicPermission();
  };

  const loadCards = async () => {
    setTestState("loading");
    try {
      // Fetch all cards in this stack to calculate mastered count
      const allCardsResponse = await fetch(`/api/stacks/${stackId}/cards`);
      if (allCardsResponse.ok) {
        const allCardsData = await allCardsResponse.json();
        const allCards = allCardsData.cards || [];
        setTotalCards(allCards.length);
        const mastered = allCards.filter((c: Card) => c.lastResult === 'pass').length;
        setMasteredCount(mastered);
      }

      // Fetch cards from the test queue API
      const response = await fetch(`/api/stacks/${stackId}/test/next?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
        setTestState(data.cards?.length > 0 ? "testing" : "complete");
      } else {
        // Fallback: fetch any cards from this stack
        const fallbackResponse = await fetch(`/api/stacks/${stackId}/cards?limit=20`);
        const fallbackData = await fallbackResponse.json();
        setCards(fallbackData.cards || []);
        setTestState(fallbackData.cards?.length > 0 ? "testing" : "complete");
      }
    } catch (error) {
      console.error("Failed to load cards:", error);
      setTestState("complete");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (isProcessing || currentIndex >= cards.length) return;

    setIsProcessing(true);
    const currentCard = cards[currentIndex];

    try {
      // Send audio to API for transcription and grading
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("cardId", currentCard.id.toString());

      const response = await fetch(`/api/stacks/${stackId}/test/attempt`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process attempt");
      }

      const data = await response.json();
      setResult({
        grade: data.grade,
        transcript: data.transcript,
        feedback: data.feedback,
        score: data.score,
      });

      setAttempts([...attempts, { cardId: currentCard.id, grade: data.grade }]);

      // Refetch mastered count if the attempt was a pass
      if (data.grade === "pass") {
        const allCardsResponse = await fetch(`/api/stacks/${stackId}/cards`);
        if (allCardsResponse.ok) {
          const allCardsData = await allCardsResponse.json();
          const allCards = allCardsData.cards || [];
          const mastered = allCards.filter((c: Card) => c.lastResult === 'pass').length;
          setMasteredCount(mastered);
        }
      }
    } catch (error) {
      console.error("Failed to process recording:", error);
      alert("Failed to process your recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setResult(null);
      setTestState("testing");
      setIsProcessing(false);
    } else {
      setTestState("complete");
    }
  };

  const handleRetryCard = () => {
    setResult(null);
    setTestState("testing");
    setIsProcessing(false);
  };

  const handleBackToReview = (cardId: number) => {
    // Navigate to review page with the specific card
    router.push(`/stacks/${stackId}/review?cardId=${cardId}`);
  };

  const handleEndSession = () => {
    router.push(`/stacks/${stackId}`);
  };

  const calculateAccuracy = () => {
    if (attempts.length === 0) return undefined;
    const passes = attempts.filter((a) => a.grade === "pass").length;
    return passes / attempts.length;
  };

  const calculateCorrectCount = () => {
    return attempts.filter((a) => a.grade === "pass").length;
  };

  // Render permission states
  if (testState === "permission") {
    console.log("[Test] Rendering permission screen, state:", permissionState);
    if (permissionState === "denied") {
      return <MicPermissionDenied onRetry={handleRetry} />;
    }
    return <MicPermissionExplainer onContinue={handleContinue} />;
  }

  // Render loading state
  if (testState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your test cards...</p>
        </div>
      </div>
    );
  }

  // Render complete state
  if (testState === "complete") {
    const hasCompletedCards = attempts.length > 0;
    const title = hasCompletedCards ? "Session Complete!" : "No Cards to Test";
    const description = hasCompletedCards
      ? `You completed ${attempts.length} card${attempts.length > 1 ? "s" : ""} with ${Math.round((calculateAccuracy() || 0) * 100)}% accuracy.`
      : "No cards available in your test stack. Add some cards from Review Mode!";
    
    return (
      <div className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          <p className="text-muted-foreground mb-8">{description}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push(`/stacks/${stackId}/${stackName}/review`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <>
      {/* Desktop and Portrait Mobile Layout */}
      <div className="flex min-h-screen flex-col landscape:hidden landscape:md:flex">
        <div className="flex-1 container px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Header */}
            <div>
              <p className="mt-2 text-muted-foreground">
                Define each card using your voice
              </p>
            </div>

            {/* Progress Strip */}
            <TestProgressStrip
              masteredCount={masteredCount}
              totalWords={totalCards}
              correctCount={calculateCorrectCount()}
              testedCount={attempts.length}
            />

            {/* Test Flashcard */}
            <TestFlashcard
              word={currentCard?.term || ""}
              wordId={currentCard?.id || 0}
              definition={currentDefinition}
              example={currentExample}
              onRecordingComplete={handleRecordingComplete}
              disabled={isProcessing}
              isProcessing={isProcessing}
              result={result}
              onNext={handleNext}
              onRetry={handleRetryCard}
              onBackToReview={handleBackToReview}
            />
          </div>
        </div>

        {/* Footer */}
        <SessionFooter
          currentIndex={currentIndex}
          totalWords={cards.length}
          accuracy={calculateAccuracy()}
          onEndSession={handleEndSession}
        />
      </div>

      {/* Landscape Mobile ONLY Layout - Fullscreen */}
      <div className="fixed inset-0 hidden landscape:flex landscape:md:hidden">
        <LandscapeSidebar />
        <div className="ml-16 flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <TestFlashcard
                word={currentCard?.term || ""}
                wordId={currentCard?.id || 0}
                definition={currentDefinition}
                example={currentExample}
                onRecordingComplete={handleRecordingComplete}
                disabled={isProcessing}
                isProcessing={isProcessing}
                result={result}
                onNext={handleNext}
                onRetry={handleRetryCard}
                onBackToReview={handleBackToReview}
              />
            </div>
          </div>

          {/* Footer - compact in landscape */}
          <div className="border-t bg-background p-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {currentIndex + 1} / {cards.length}
              </span>
              {calculateAccuracy() !== undefined && (
                <span className="text-muted-foreground">
                  {Math.round((calculateAccuracy() || 0) * 100)}% accuracy
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
